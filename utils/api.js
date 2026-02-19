// API请求封装
const app = getApp()

const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    // 如果url已经是完整URL，直接使用；否则拼接基础URL
    const fullUrl = url.startsWith('http') ? url : `${app.globalData.apiBaseUrl}${url}`
    
    wx.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': options.contentType || 'application/x-www-form-urlencoded',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          if (res.data && res.data.success) {
            resolve(res.data)
          } else {
            // 如果API返回了错误信息，直接传递给调用方
            reject(res.data || { message: '请求失败' })
          }
        } else {
          reject({
            success: false,
            message: `请求失败，状态码：${res.statusCode}`
          })
        }
      },
      fail: (err) => {
        reject({
          success: false,
          message: '网络请求失败',
          error: err
        })
      }
    })
  })
}

// 抖音视频解析API
const parseDouyinVideo = (url) => {
  return request(`api.php?action=parse&url=${url}`, {
    method: 'GET'
  })
}

// 快手视频解析API
const parseKuaishouVideo = (url) => {
  // 现在使用统一的parse接口
  return request(`api.php?action=parse&url=${url}`, {
    method: 'GET'
  })
}

// 统一视频解析API（自动识别平台）
const parseVideo = (url) => {
  // 直接调用抖音解析API，因为后端已经统一处理所有平台
  return request(`api.php?action=parse&url=${url}`, {
    method: 'GET'
  })
}

// 检测视频平台
const detectVideoPlatform = (url) => {
  if (!url) return null
  
  // 抖音域名列表
  const douyinDomains = ['douyin.com', 'v.douyin.com', 'www.douyin.com', 'iesdouyin.com'];
  
  // 快手域名列表
  const kuaishouDomains = ['kuaishou.com', 'www.kuaishou.com', 'v.kuaishou.com', 'chenzhongtech.com'];
  
  // 小红书域名列表
  const xiaohongshuDomains = ['xiaohongshu.com', 'www.xiaohongshu.com', 'xhslink.com'];
  
  // 解析URL
  try {
    const parsedUrl = new URL(url)
    
    // 检测抖音
    for (const domain of douyinDomains) {
      if (parsedUrl.host.includes(domain)) {
        return 'douyin'
      }
    }
    
    // 检测快手
    for (const domain of kuaishouDomains) {
      if (parsedUrl.host.includes(domain)) {
        return 'kuaishou'
      }
    }
    
    // 检测小红书
    for (const domain of xiaohongshuDomains) {
      if (parsedUrl.host.includes(domain)) {
        return 'xiaohongshu'
      }
    }
  } catch (e) {
    // URL解析失败，返回null
    return null
  }
  
  return null // 未知平台
}

module.exports = {
  request,
  parseDouyinVideo,
  parseKuaishouVideo,
  parseVideo,
  detectVideoPlatform
}