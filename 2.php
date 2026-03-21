<?php

namespace app\api\controller;

/**
 * 解析接口配置
 * Class Apis
 * @package app\api\controller
 */
class Apis extends Controller
{

    public function analysis($videoUrl)
    {
        $this->getUser();
        $links = ['x.com', 'twitter.com', 'tiktok.com', 'youtube.com.com'];
        $parsedLink = parse_url($videoUrl);
        $host = $parsedLink['host'];
        $pieces = explode('.', $host);
        $topLevelDomain = array_pop($pieces);
        $secondLevelDomain = array_pop($pieces);
        $oneLevelDomain = $secondLevelDomain . '.' . $topLevelDomain;
        if (in_array($oneLevelDomain, $links)) {
            return [
                "code" => -1,
                "data" => null,
                "msg" => "禁止输入违规链接"
            ];
        }

        try {
            // 使用当前用户的接口地址（与接口秘钥中显示的地址一致）
            $http_type = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] == 'https')) ? 'https://' : 'http://';
            $url = $http_type . $_SERVER['HTTP_HOST'] . "/api/dsp/" . $this->userinfo['api_token'] . "/" . $this->userinfo['id'] . "/?url=" . $videoUrl;
            $s = file_get_contents($url);
            $s = json_decode($s, true);

            if ($s['code'] == '0001') {
                $s = $s['data'];

                $reData = [
                    "title" => $s['desc'],
                    "cover" => $s['cover']
                ];
                if ($s['type'] == '2') {
                    $reData['images'] = $s['pics'];
                    if ($s['live']){
                        $reData['live'] = $s['live'];
                    }
                } else {
                    $reData['video'] = $this->getUrl302($s['playAddr']);
                }

                return [
                    "code" => 200,
                    "data" => $reData,
                    "msg" => "解析成功"
                ];
            } else {
                return [
                    "code" => -1,
                    "data" => null,
                    "msg" => "解析失败，不支持该平台"
                ];
            }
        } catch (\Exception $e) {
            return [
                "code" => -1,
                "data" => null,
                "msg" => "解析失败，程序出错了"
            ];
        }


    }


    private function curl($url, $headers = [])
    {
        $header = ['User-Agent:Mozilla/5.0 (Linux; U; Android 9; zh-cn; Redmi Note 5 Build/PKQ1.180904.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/71.0.3578.141 Mobile Safari/537.36 XiaoMi/MiuiBrowser/11.10.8'];
        $con = curl_init((string)$url);
        curl_setopt($con, CURLOPT_HEADER, false);
        curl_setopt($con, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($con, CURLOPT_RETURNTRANSFER, true);
        if (!empty($headers)) {
            curl_setopt($con, CURLOPT_HTTPHEADER, $headers);
        } else {
            curl_setopt($con, CURLOPT_HTTPHEADER, $header);
        }
        curl_setopt($con, CURLOPT_TIMEOUT, 5000);
        $result = curl_exec($con);
        return $result;
    }

    function getUrl302($url)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        $header = array('User-Agent:Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36');
        curl_setopt($ch, CURLOPT_HTTPHEADER, $header);
        curl_setopt($ch, CURLOPT_VERBOSE, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_AUTOREFERER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $info = curl_getinfo($ch);
        curl_close($ch);

        return $info['url'];
    }

}