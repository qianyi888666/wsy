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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (res.data && res.data.success) {
            resolve(res.data)
          } else {
            const errMsg = res.data && (res.data.message || res.data.msg || res.data.error)
            reject({ message: errMsg || '请求失败' })
          }
        } else {
          const errMsg = res.data && (res.data.message || res.data.msg || res.data.error)
          reject({
            success: false,
            message: errMsg || `请求失败，状态码：${res.statusCode}`
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
const parseDouyinVideo = (url, userToken = '') => {
  let requestUrl = `api.php?action=parse&url=${encodeURIComponent(url)}`
  if (userToken) {
    requestUrl += `&user_token=${encodeURIComponent(userToken)}`
  }
  return request(requestUrl, {
    method: 'GET'
  })
}

// 快手视频解析API
const parseKuaishouVideo = (url, userToken = '') => {
  let requestUrl = `api.php?action=parse&url=${encodeURIComponent(url)}`
  if (userToken) {
    requestUrl += `&user_token=${encodeURIComponent(userToken)}`
  }
  return request(requestUrl, {
    method: 'GET'
  })
}

// 统一视频解析API（自动识别平台）
const parseVideo = (url, userToken = '', userId = 0) => {
  let requestUrl = `api.php?action=parse&url=${encodeURIComponent(url)}`
  if (userToken) {
    requestUrl += `&user_token=${encodeURIComponent(userToken)}`
  }
  if (userId) {
    requestUrl += `&user_id=${userId}`
  }
  return request(requestUrl, {
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

const getPointsInfo = (userToken, userId = 0) => {
  return request('api.php', {
    method: 'GET',
    data: {
      action: 'get_points_info',
      user_token: userToken,
      user_id: userId || undefined
    }
  })
}

const checkAdWatch = (userToken) => {
  return request('api.php', {
    method: 'GET',
    data: {
      action: 'check_ad_watch',
      user_token: userToken
    }
  })
}

const claimAdPoints = (userToken, adId) => {
  return request('api.php', {
    method: 'POST',
    data: {
      action: 'claim_ad_points',
      user_token: userToken,
      ad_id: adId
    }
  })
}

const getPointsLog = (userToken, page = 1, limit = 20, filter = 'all') => {
  return request('api.php', {
    method: 'GET',
    data: {
      action: 'get_points_log',
      user_token: userToken,
      page: page,
      limit: limit,
      filter: filter
    }
  })
}

const uploadPromotionImage = (filePath) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${app.globalData.apiBaseUrl}api.php?action=upload_promotion_image`,
      filePath: filePath,
      name: 'image',
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data && data.success) {
            resolve(data)
          } else {
            reject(data || { message: '上传失败' })
          }
        } catch (e) {
          reject({ message: '解析响应失败' })
        }
      },
      fail: (err) => {
        reject({
          success: false,
          message: '上传失败',
          error: err
        })
      }
    })
  })
}

const publishPromotion = (data) => {
  return request('api.php', {
    method: 'POST',
    data: {
      action: 'publish_promotion',
      ...data
    }
  })
}

const getMyPromotions = (data) => {
  return request('api.php', {
    method: 'GET',
    data: {
      action: 'get_my_promotions',
      user_token: data.user_token
    }
  })
}

const getAllPromotions = (data) => {
  return request('api.php', {
    method: 'GET',
    data: {
      action: 'get_all_promotions',
      page: data.page || 1,
      limit: data.limit || 20,
      category: data.category || '',
      keyword: data.keyword || ''
    }
  })
}

const updatePromotion = (data) => {
  return request('api.php', {
    method: 'POST',
    data: {
      action: 'update_promotion',
      ...data
    }
  })
}

const togglePromotionStatus = (data) => {
  return request('api.php', {
    method: 'POST',
    data: {
      action: 'toggle_promotion_status',
      id: data.id,
      status: data.status,
      user_token: data.user_token
    }
  })
}

const getPromotionDetail = (data) => {
  return request('api.php', {
    method: 'GET',
    data: {
      action: 'get_promotion_detail',
      id: data.id
    }
  })
}

const deletePromotion = (data) => {
  return request('api.php', {
    method: 'POST',
    data: {
      action: 'delete_promotion',
      id: data.id,
      user_token: data.user_token
    }
  })
}

const updateUserInfo = (data) => {
  return request('api.php', {
    method: 'POST',
    data: {
      action: 'update_user_info',
      user_token: data.user_token,
      nickname: data.nickname || '',
      avatar_url: data.avatar_url || ''
    }
  })
}

const getUserInfo = (openid) => {
  return request('api.php', {
    method: 'GET',
    data: {
      action: 'get_user_info',
      openid: openid
    }
  })
}

module.exports = {
  request,
  parseDouyinVideo,
  parseKuaishouVideo,
  parseVideo,
  detectVideoPlatform,
  getPointsInfo,
  checkAdWatch,
  claimAdPoints,
  getPointsLog,
  uploadPromotionImage,
  publishPromotion,
  getMyPromotions,
  getAllPromotions,
  updatePromotion,
  togglePromotionStatus,
  getPromotionDetail,
  deletePromotion,
  updateUserInfo,
  getUserInfo
}