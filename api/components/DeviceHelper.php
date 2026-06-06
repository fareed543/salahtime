<?php

namespace app\components; // Ensure this matches your file location

class DeviceHelper
{
    public static function getDeviceInfo()
    {
        $user_agent = $_SERVER['HTTP_USER_AGENT'];

        // OS Detection
        $osArray = [
            '/windows nt 11/i' => 'Windows 11',
            '/windows nt 10/i' => 'Windows 10',
            '/macintosh|mac os x/i' => 'Mac OS X',
            '/linux/i' => 'Linux',
            '/ubuntu/i' => 'Ubuntu',
            '/iphone/i' => 'iPhone',
            '/android/i' => 'Android',
        ];

        $os = 'Unknown OS';
        foreach ($osArray as $regex => $value) {
            if (preg_match($regex, $user_agent)) {
                $os = $value;
                break;
            }
        }

        // Browser Detection
        $browserArray = [
            '/firefox/i' => 'Firefox',
            '/safari/i' => 'Safari',
            '/chrome/i' => 'Chrome',
            '/edge/i' => 'Edge',
            '/opera/i' => 'Opera',
        ];

        $browser = 'Unknown Browser';
        foreach ($browserArray as $regex => $value) {
            if (preg_match($regex, $user_agent)) {
                $browser = $value;
                break;
            }
        }

        // Device Type Detection
        if (preg_match('/mobile/i', $user_agent)) {
            $deviceType = 'Mobile';
        } elseif (preg_match('/tablet|ipad/i', $user_agent)) {
            $deviceType = 'Tablet';
        } else {
            $deviceType = 'Desktop';
        }

        return [
            'browser' => $browser,
            'os' => $os,
            'device_type' => $deviceType,
            'user_agent' => $user_agent
        ];
    }
}
