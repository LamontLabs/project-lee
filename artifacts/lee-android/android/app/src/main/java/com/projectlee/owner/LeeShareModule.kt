package com.projectlee.owner

import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.ByteArrayOutputStream
import java.net.URI
import java.security.MessageDigest
import java.util.Locale

private const val MAX_BYTES = 5 * 1024 * 1024
private const val MAX_TEXT_BYTES = 20_000
private const val SHARE_EVENT = "LeeShareReceived"

data class LeeSharePayload(
  val captureId: String,
  val captureType: String,
  val text: String?,
  val filename: String?,
  val mimeType: String?,
  val contentBase64: String?,
  val byteSize: Int?,
  val capturedAt: String,
  val sourceMetadata: Map<String, String>,
)

class LeeShareModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private var module: LeeShareModule? = null

    fun receiveIntent(intent: Intent?) {
      module?.handleIntent(intent, emit = true)
    }
  }

  override fun getName(): String = "LeeShare"

  override fun initialize() {
    super.initialize()
    module = this
  }

  override fun invalidate() {
    if (module === this) module = null
    super.invalidate()
  }

  @ReactMethod
  fun getInitialShare(promise: Promise) {
    try {
      val intent = reactContext.currentActivity?.intent
      promise.resolve(handleIntent(intent, emit = false)?.toWritableMap())
    } catch (error: Exception) {
      promise.reject("LEE_SHARE_REJECTED", error.message ?: "Shared content was rejected safely.")
    }
  }

  private fun handleIntent(intent: Intent?, emit: Boolean): LeeSharePayload? {
    val payload = parseIntent(intent) ?: return null
    if (emit && reactContext.hasActiveCatalystInstance()) {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(SHARE_EVENT, payload.toWritableMap())
    }
    return payload
  }

  private fun parseIntent(intent: Intent?): LeeSharePayload? {
    if (intent?.action != Intent.ACTION_SEND) return null
    val declaredMime = intent.type?.trim()?.lowercase(Locale.US) ?: return null
    if (!isRegisteredMime(declaredMime)) return null

    val sharedText = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()?.trim().orEmpty()
    val streamUri = streamUri(intent)
    val metadata = mutableMapOf(
      "sharedVia" to "android-system-share",
      "captureOrigin" to "android-share-sheet",
      "sharedMimeType" to declaredMime,
    )
    safeReferrer(intent)?.let { metadata["originatingApp"] = it }

    if (streamUri == null) {
      if (!sharedText.isSafeText()) return null
      if (declaredMime == "text/uri-list" || sharedText.startsWith("http://") || sharedText.startsWith("https://")) {
        if (!sharedText.isHttpUrl()) return null
        metadata["contentKind"] = "link"
        return LeeSharePayload(
          stableId("link", declaredMime, sharedText.toByteArray(), null),
          "link",
          sharedText,
          sharedText,
          "text/uri-list",
          null,
          sharedText.toByteArray(Charsets.UTF_8).size,
          now(),
          metadata,
        )
      }
      if (declaredMime != "text/plain") return null
      metadata["contentKind"] = "plain-text"
      return LeeSharePayload(
        stableId("text", declaredMime, sharedText.toByteArray(Charsets.UTF_8), null),
        "text",
        sharedText,
        "shared-text.txt",
        "text/plain",
        null,
        sharedText.toByteArray(Charsets.UTF_8).size,
        now(),
        metadata,
      )
    }

    if (streamUri.scheme?.lowercase(Locale.US) != "content") return null
    val filename = safeFilename(displayName(streamUri))
    val effectiveMime = (reactContext.contentResolver.getType(streamUri) ?: declaredMime).lowercase(Locale.US)
    if (!isRegisteredMime(effectiveMime) || isExecutable(effectiveMime, filename)) return null
    val bytes = readBounded(streamUri) ?: return null
    val contentType = when {
      effectiveMime == "application/pdf" || filename.endsWith(".pdf", ignoreCase = true) -> "pdf"
      effectiveMime.startsWith("image/") -> "image"
      isDocument(effectiveMime, filename) -> "document"
      else -> return null
    }
    if (contentType == "pdf" && effectiveMime != "application/pdf" && !filename.endsWith(".pdf", ignoreCase = true)) return null
    if (contentType == "document" && !isDocument(effectiveMime, filename)) return null
    metadata["contentKind"] = contentType
    metadata["uriScheme"] = "content"
    return LeeSharePayload(
      stableId(contentType, effectiveMime, bytes, filename),
      contentType,
      sharedText.takeIf { it.isSafeText() },
      filename.ifBlank { defaultFilename(contentType, effectiveMime) },
      effectiveMime,
      Base64.encodeToString(bytes, Base64.NO_WRAP),
      bytes.size,
      now(),
      metadata,
    )
  }

  private fun streamUri(intent: Intent): Uri? {
    @Suppress("DEPRECATION")
    return intent.getParcelableExtra(Intent.EXTRA_STREAM)
  }

  private fun displayName(uri: Uri): String {
    var cursor: Cursor? = null
    return try {
      cursor = reactContext.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
      if (cursor?.moveToFirst() == true) cursor.getString(0).orEmpty() else ""
    } catch (_: Exception) {
      ""
    } finally {
      cursor?.close()
    }
  }

  private fun readBounded(uri: Uri): ByteArray? {
    return try {
      val output = ByteArrayOutputStream()
      reactContext.contentResolver.openInputStream(uri)?.use { input ->
        val buffer = ByteArray(8192)
        var total = 0
        while (true) {
          val read = input.read(buffer)
          if (read <= 0) break
          total += read
          if (total > MAX_BYTES) return null
          output.write(buffer, 0, read)
        }
      }?.let {
        output.toByteArray().takeIf { bytes -> bytes.isNotEmpty() && bytes.size <= MAX_BYTES }
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun safeReferrer(intent: Intent): String? {
    val value = intent.getStringExtra(Intent.EXTRA_REFERRER_NAME)?.trim().orEmpty()
    return value.takeIf { it.length in 1..160 && !it.contains('\u0000') }
  }

  private fun LeeSharePayload.toWritableMap(): WritableMap {
    val map = Arguments.createMap()
    map.putString("captureId", captureId)
    map.putString("captureType", captureType)
    text?.let { map.putString("text", it) }
    filename?.let { map.putString("filename", it) }
    mimeType?.let { map.putString("mimeType", it) }
    contentBase64?.let { map.putString("contentBase64", it) }
    byteSize?.let { map.putInt("byteSize", it) }
    map.putString("capturedAt", capturedAt)
    val metadata = Arguments.createMap()
    sourceMetadata.forEach { (key, value) -> metadata.putString(key, value) }
    map.putMap("sourceMetadata", metadata)
    return map
  }

  private fun stableId(type: String, mime: String, bytes: ByteArray, filename: String?): String {
    val digest = MessageDigest.getInstance("SHA-256")
      .digest((type + "|" + mime + "|" + (filename ?: "") + "|").toByteArray() + bytes)
      .joinToString("") { "%02x".format(it) }
    return "android-share-${digest.take(48)}"
  }

  private fun isRegisteredMime(mime: String) =
    mime == "text/plain" ||
      mime == "text/uri-list" ||
      mime == "application/pdf" ||
      mime == "text/csv" ||
      mime == "text/markdown" ||
      mime == "application/rtf" ||
      mime == "application/msword" ||
      mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime.startsWith("image/")

  private fun isDocument(mime: String, filename: String) =
    mime == "application/pdf" ||
      mime == "text/plain" ||
      mime == "text/csv" ||
      mime == "text/markdown" ||
      mime == "application/rtf" ||
      mime == "application/msword" ||
      mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      filename.matches(Regex(".*\\.(csv|doc|docx|md|pdf|rtf|txt)$", RegexOption.IGNORE_CASE))

  private fun isExecutable(mime: String, filename: String) =
    mime.contains(Regex("x-msdownload|x-sh|x-executable|java-archive|x-apple-diskimage|x-apple-installer|android\\.package-archive", RegexOption.IGNORE_CASE)) ||
      filename.matches(Regex(".*\\.(apk|app|bat|bin|cmd|com|dmg|exe|jar|js|mjs|pkg|ps1|sh|so|vbs)$", RegexOption.IGNORE_CASE))

  private fun safeFilename(value: String): String =
    value.replace('\\', '/').substringAfterLast('/').replace(Regex("[\\u0000-\\u001f\\u007f]"), "").trim().take(240)

  private fun defaultFilename(type: String, mime: String) =
    when (type) {
      "image" -> if (mime == "image/png") "lee-shared-image.png" else "lee-shared-image"
      "pdf" -> "lee-shared-document.pdf"
      else -> "lee-shared-document"
    }

  private fun String.isSafeText() =
    isNotBlank() && toByteArray(Charsets.UTF_8).size <= MAX_TEXT_BYTES

  private fun String.isHttpUrl(): Boolean {
    return try {
      val parsed = URI(this)
      (parsed.scheme == "http" || parsed.scheme == "https") && !parsed.host.isNullOrBlank() && parsed.fragment?.contains('\u0000') != true
    } catch (_: Exception) {
      false
    }
  }

  private fun now() = java.time.Instant.now().toString()
}