# 抖音视频解析小程序

这是一个微信小程序，用于解析抖音视频链接并获取无水印下载地址。

## 项目结构

```
去水印小工具/
├── api.php              # 小程序API接口（新增）
├── api_handler.php      # 抖音视频解析API处理类
├── config.php           # API配置文件
├── parse.php            # 视频解析请求处理
├── index.php            # 网页版首页
└── miniprogram/         # 微信小程序代码
    ├── app.js           # 小程序入口
    ├── app.json         # 小程序全局配置
    ├── app.wxss         # 小程序全局样式
    ├── pages/           # 页面目录
    │   └── index/       # 首页
    │       ├── index.js
    │       ├── index.json
    │       ├── index.wxml
    │       └── index.wxss
    ├── utils/           # 工具函数
    │   └── api.js       # API请求封装
    ├── images/          # 图片资源
    ├── project.config.json  # 项目配置
    └── sitemap.json     # 站点地图
```

## 使用说明

### 1. 后端配置

1. 将 `api.php`、`api_handler.php`、`config.php` 和 `parse.php` 上传到您的服务器
2. 确保服务器支持PHP，并且已安装cURL扩展
3. 修改 `miniprogram/app.js` 中的 `apiBaseUrl` 为您的实际域名

### 2. 小程序配置

1. 在微信开发者工具中导入 `miniprogram` 目录
2. 在 `project.config.json` 中填入您的小程序AppID
3. 在小程序管理后台配置服务器域名，添加您的服务器域名到request合法域名中

### 3. 功能特点

- 支持解析抖音视频链接
- 提取无水印视频下载地址
- 显示视频作者、标题、封面等信息
- 支持复制下载链接
- 优雅的UI设计，适配不同屏幕尺寸

## 注意事项

1. 确保您的服务器已正确配置CORS，允许小程序跨域请求
2. 小程序中的网络请求域名需要在微信小程序后台进行配置
3. 请遵守相关法律法规，不要用于商业用途
4. 本项目仅供学习交流使用

## 开发者

- 后端API：使用PHP开发，调用第三方抖音解析API
- 小程序前端：使用微信小程序原生开发框架

## 版本历史

- v1.0.0: 初始版本，实现基本的抖音视频解析功能