package com.projectlee.owner

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.DisplayMetrics
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream
import java.util.concurrent.atomic.AtomicBoolean

private const val SCREEN_PERMISSION_REQUEST = 4901
private const val MAX_SAMPLE_BYTES = 5 * 1024 * 1024

class LeeScreenCaptureModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private var module: LeeScreenCaptureModule? = null

    fun handleActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode == SCREEN_PERMISSION_REQUEST) module?.resolvePermission(resultCode, data)
    }
  }

  private var permissionPromise: Promise? = null
  private var projection: MediaProjection? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var imageReader: ImageReader? = null
  private val stopped = AtomicBoolean(false)

  override fun getName(): String = "LeeScreenCapture"

  override fun initialize() {
    super.initialize()
    module = this
    stopped.set(false)
  }

  override fun invalidate() {
    if (module === this) module = null
    stopProjection()
    super.invalidate()
  }

  @ReactMethod
  fun requestPermission(promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("LEE_SCREEN_UNAVAILABLE", "The Owner app is not in the foreground.")
      return
    }
    if (permissionPromise != null) {
      promise.reject("LEE_SCREEN_BUSY", "A screen permission request is already pending.")
      return
    }
    val manager = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    permissionPromise = promise
    stopped.set(false)
    activity.startActivityForResult(manager.createScreenCaptureIntent(), SCREEN_PERMISSION_REQUEST)
  }

  private fun resolvePermission(resultCode: Int, data: Intent?) {
    val promise = permissionPromise ?: return
    permissionPromise = null
    if (resultCode != Activity.RESULT_OK || data == null) {
      promise.resolve(false)
      return
    }
    val manager = reactContext.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    projection = manager.getMediaProjection(resultCode, data)
    stopped.set(false)
    promise.resolve(projection != null)
  }

  @ReactMethod
  fun captureSample(promise: Promise) {
    val activeProjection = projection
    if (activeProjection == null || stopped.get()) {
      promise.reject("LEE_SCREEN_NOT_ACTIVE", "Explicit screen-capture permission is not active.")
      return
    }
    val metrics = DisplayMetrics()
    @Suppress("DEPRECATION")
    reactContext.currentActivity?.windowManager?.defaultDisplay?.getRealMetrics(metrics)
    val width = metrics.widthPixels.coerceAtMost(720).coerceAtLeast(1)
    val height = metrics.heightPixels.coerceAtMost(1280).coerceAtLeast(1)
    val density = metrics.densityDpi.coerceAtLeast(1)
    val reader = ImageReader.newInstance(width, height, android.graphics.PixelFormat.RGBA_8888, 2)
    imageReader = reader
    virtualDisplay = activeProjection.createVirtualDisplay(
      "LEE bounded screen sample",
      width,
      height,
      density,
      DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
      reader.surface,
      null,
      null,
    )
    Handler(Looper.getMainLooper()).postDelayed({
      try {
        val image = reader.acquireLatestImage()
        if (image == null) {
          promise.reject("LEE_SCREEN_EMPTY", "The screen did not yield a bounded frame.")
          releaseSampleResources()
          return@postDelayed
        }
        image.use {
          val plane = it.planes[0]
          val rowPadding = (plane.rowStride - plane.pixelStride * width) / plane.pixelStride
          val padded = Bitmap.createBitmap(width + rowPadding, height, Bitmap.Config.ARGB_8888)
          padded.copyPixelsFromBuffer(plane.buffer)
          val bitmap = Bitmap.createBitmap(padded, 0, 0, width, height)
          padded.recycle()
          val output = ByteArrayOutputStream()
          bitmap.compress(Bitmap.CompressFormat.PNG, 70, output)
          bitmap.recycle()
          val bytes = output.toByteArray()
          if (bytes.isEmpty() || bytes.size > MAX_SAMPLE_BYTES) {
            promise.reject("LEE_SCREEN_TOO_LARGE", "The bounded screen sample exceeded the evidence limit.")
          } else {
            val result = Arguments.createMap()
            result.putString("contentBase64", Base64.encodeToString(bytes, Base64.NO_WRAP))
            result.putString("mimeType", "image/png")
            result.putInt("byteSize", bytes.size)
            result.putString("filename", "lee-screen-observation.png")
            result.putString("capturedAt", java.time.Instant.now().toString())
            promise.resolve(result)
          }
        }
      } catch (error: Exception) {
        promise.reject("LEE_SCREEN_CAPTURE_FAILED", error.message ?: "The bounded screen sample failed.")
      } finally {
        releaseSampleResources()
      }
    }, 250)
  }

  @ReactMethod
  fun stop(promise: Promise) {
    stopProjection()
    promise.resolve(null)
  }

  private fun releaseSampleResources() {
    virtualDisplay?.release()
    virtualDisplay = null
    imageReader?.close()
    imageReader = null
  }

  private fun stopProjection() {
    permissionPromise?.let { it.resolve(false) }
    permissionPromise = null
    releaseSampleResources()
    projection?.stop()
    projection = null
    stopped.set(true)
  }
}