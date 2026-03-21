<?php
/**
 * 视频解析API配置
 * 支持抖音、快手等平台视频解析
 */

// API接口地址基础URL
define('API_BASE_URL', 'http://apis.ppt6.top');

// API密钥
define('CLIENT_SECRET_KEY', '32CAF695EED14BA145512443BBB3229C4501F22384B8997806');

// 客户端ID
define('CLIENT_ID', '202037162');

// 请求超时时间（秒）
define('API_TIMEOUT', 30);

// 最大重试次数
define('MAX_RETRY', 3);

// 错误码定义
define('ERROR_INVALID_URL', 1001);
define('ERROR_API_FAILED', 1002);
define('ERROR_JSON_PARSE', 1003);
define('ERROR_INSUFFICIENT_TIMES', 1004);
define('ERROR_MEMBER_LEVEL_INSUFFICIENT', 1005);

// 错误信息
$errorMessages = [
    ERROR_INVALID_URL => '请输入有效的视频链接',
    ERROR_API_FAILED => 'API请求失败，请稍后重试',
    ERROR_JSON_PARSE => '数据解析失败，请稍后重试',
    ERROR_INSUFFICIENT_TIMES => '次数不足，请升级VIP等级或明天再试',
    ERROR_MEMBER_LEVEL_INSUFFICIENT => '会员等级不足，请联系开通会员或者升级会员等级'
];