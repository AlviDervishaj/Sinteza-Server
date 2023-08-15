import sys
import GramAddict.core.device_facade as device_facade

deviceId = sys.argv[1]
print(deviceId)
device = device_facade.DeviceFacade(deviceId, "com.instagram.android")
device.press_power()

print("[INFO] Pressed power button.")
