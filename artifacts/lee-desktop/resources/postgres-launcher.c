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

static void disableStandardHandleInheritance() {
  const DWORD standardHandles[] = { STD_INPUT_HANDLE, STD_OUTPUT_HANDLE, STD_ERROR_HANDLE };
  for (DWORD standardHandle : standardHandles) {
    HANDLE handle = GetStdHandle(standardHandle);
    if (handle != nullptr && handle != INVALID_HANDLE_VALUE) {
      SetHandleInformation(handle, HANDLE_FLAG_INHERIT, 0);
    }
  }
}

int wmain(int argc, wchar_t** argv) {
  const wchar_t* logPath = _wgetenv(L"LEE_POSTGRES_LAUNCHER_LOG");
  const bool detached = argc > 1 && _wcsicmp(argv[1], L"--detach") == 0;
  const int commandIndex = detached ? 2 : 1;
  if (argc <= commandIndex) {
    appendLog(logPath, L"native-launcher-error: missing command\n");
    return 2;
  }

  std::wstring commandLine = quoteArgument(argv[commandIndex]);
  for (int index = commandIndex + 1; index < argc; ++index) {
    commandLine.push_back(L' ');
    commandLine += quoteArgument(argv[index]);
  }
  appendLog(logPath, L"native-launcher-start: " + commandLine + L"\n");

  std::vector<wchar_t> mutableCommand(commandLine.begin(), commandLine.end());
  mutableCommand.push_back(L'\0');
  STARTUPINFOW startupInfo = {};
  startupInfo.cb = sizeof(startupInfo);
  HANDLE childLog = INVALID_HANDLE_VALUE;
  const wchar_t* childLogPath = _wgetenv(L"LEE_CHILD_OUTPUT_LOG");
  if (childLogPath && *childLogPath) {
    childLog = CreateFileW(childLogPath, FILE_APPEND_DATA, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (childLog != INVALID_HANDLE_VALUE) {
      SetHandleInformation(childLog, HANDLE_FLAG_INHERIT, HANDLE_FLAG_INHERIT);
      startupInfo.dwFlags = STARTF_USESTDHANDLES;
      startupInfo.hStdInput = childLog;
      startupInfo.hStdOutput = childLog;
      startupInfo.hStdError = childLog;
      disableStandardHandleInheritance();
    }
  }
  PROCESS_INFORMATION processInfo = {};
  const DWORD creationFlags = CREATE_NO_WINDOW | (detached ? CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS : 0);
  if (!CreateProcessW(nullptr, mutableCommand.data(), nullptr, nullptr, childLog != INVALID_HANDLE_VALUE, creationFlags, nullptr, nullptr, &startupInfo, &processInfo)) {
    if (childLog != INVALID_HANDLE_VALUE) CloseHandle(childLog);
    appendLog(logPath, L"native-launcher-create-error: " + std::to_wstring(GetLastError()) + L"\n");
    return 1;
  }
  if (childLog != INVALID_HANDLE_VALUE) CloseHandle(childLog);

  if (detached) {
    const wchar_t* pidPath = _wgetenv(L"LEE_LAUNCHED_PID_FILE");
    if (pidPath && *pidPath) appendLog(pidPath, std::to_wstring(processInfo.dwProcessId) + L"\n");
    Sleep(250);
    DWORD childExitCode = STILL_ACTIVE;
    GetExitCodeProcess(processInfo.hProcess, &childExitCode);
    if (childExitCode != STILL_ACTIVE) appendLog(logPath, L"native-launcher-child-exit: status=" + std::to_wstring(childExitCode) + L"\n");
    appendLog(logPath, L"native-launcher-detached: pid=" + std::to_wstring(processInfo.dwProcessId) + L"\n");
    CloseHandle(processInfo.hThread);
    CloseHandle(processInfo.hProcess);
    return 0;
  }

  WaitForSingleObject(processInfo.hProcess, INFINITE);
  DWORD exitCode = 1;
  GetExitCodeProcess(processInfo.hProcess, &exitCode);
  CloseHandle(processInfo.hThread);
  CloseHandle(processInfo.hProcess);
  appendLog(logPath, L"native-launcher-exit: status=" + std::to_wstring(exitCode) + L"\n");
  return static_cast<int>(exitCode);
}