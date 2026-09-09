#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <cstdlib>
#include <string>
#include <vector>

static std::wstring quoteArgument(const wchar_t* value) {
  std::wstring quoted = L"\"";
  size_t backslashes = 0;
  for (const wchar_t* cursor = value; *cursor; ++cursor) {
    if (*cursor == L'\\') {
      ++backslashes;
      continue;
    }
    if (*cursor == L'"') {
      quoted.append(backslashes * 2 + 1, L'\\');
      quoted.push_back(L'"');
      backslashes = 0;
      continue;
    }
    quoted.append(backslashes, L'\\');
    quoted.push_back(*cursor);
    backslashes = 0;
  }
  quoted.append(backslashes * 2, L'\\');
  quoted.push_back(L'"');
  return quoted;
}

static void appendLog(const wchar_t* path, const std::wstring& message) {
  if (!path || !*path) return;
  HANDLE file = CreateFileW(path, FILE_APPEND_DATA, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (file == INVALID_HANDLE_VALUE) return;
  int byteCount = WideCharToMultiByte(CP_UTF8, 0, message.data(), static_cast<int>(message.size()), nullptr, 0, nullptr, nullptr);
  if (byteCount > 0) {
    std::string utf8(static_cast<size_t>(byteCount), '\0');
    WideCharToMultiByte(CP_UTF8, 0, message.data(), static_cast<int>(message.size()), &utf8[0], byteCount, nullptr, nullptr);
    DWORD written = 0;
    WriteFile(file, utf8.data(), static_cast<DWORD>(utf8.size()), &written, nullptr);
  }
  CloseHandle(file);
}

int wmain(int argc, wchar_t** argv) {
  const wchar_t* logPath = _wgetenv(L"LEE_POSTGRES_LAUNCHER_LOG");
  if (argc < 2) {
    appendLog(logPath, L"native-launcher-error: missing command\n");
    return 2;
  }

  std::wstring commandLine = quoteArgument(argv[1]);
  for (int index = 2; index < argc; ++index) {
    commandLine.push_back(L' ');
    commandLine += quoteArgument(argv[index]);
  }
  appendLog(logPath, L"native-launcher-start: " + commandLine + L"\n");

  std::vector<wchar_t> mutableCommand(commandLine.begin(), commandLine.end());
  mutableCommand.push_back(L'\0');
  STARTUPINFOW startupInfo = {};
  startupInfo.cb = sizeof(startupInfo);
  PROCESS_INFORMATION processInfo = {};
  if (!CreateProcessW(nullptr, mutableCommand.data(), nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, nullptr, &startupInfo, &processInfo)) {
    appendLog(logPath, L"native-launcher-create-error: " + std::to_wstring(GetLastError()) + L"\n");
    return 1;
  }

  WaitForSingleObject(processInfo.hProcess, INFINITE);
  DWORD exitCode = 1;
  GetExitCodeProcess(processInfo.hProcess, &exitCode);
  CloseHandle(processInfo.hThread);
  CloseHandle(processInfo.hProcess);
  appendLog(logPath, L"native-launcher-exit: status=" + std::to_wstring(exitCode) + L"\n");
  return static_cast<int>(exitCode);
}