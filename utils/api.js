const app = getApp()

const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
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
            const errCode = res.data && res.data.code
            reject({ code: errCode, message: errMsg || '请求失败' })
          }
        } else {
          const errMsg = res.data && (res.data.message || res.data.msg || res.data.error)
          const errCode = res.data && res.data.code
          reject({
            code: errCode,
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

const parseDouyinVideo = (url, userToken = '') => {
  let requestUrl = `api.php?action=parse&url=${encodeURIComponent(url)}`
  if (userToken) {
    requestUrl += `&user_token=${encodeURIComponent(userToken)}`
  }
  return request(requestUrl, {
    method: 'GET'
  })
}

const parseKuaishouVideo = (url, userToken = '') => {
  let requestUrl = `api.php?action=parse&url=${encodeURIComponent(url)}`
  if (userToken) {
    requestUrl += `&user_token=${encodeURIComponent(userToken)}`
  }
  return request(requestUrl, {
    method: 'GET'
  })
}

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

const detectVideoPlatform = (url) => {
  if (!url) return null
  
  const douyinDomains = ['douyin.com', 'v.douyin.com', 'www.douyin.com', 'iesdouyin.com'];
  const kuaishouDomains = ['kuaishou.com', 'www.kuaishou.com', 'v.kuaishou.com', 'chenzhongtech.com'];
  const xiaohongshuDomains = ['xiaohongshu.com', 'www.xiaohongshu.com', 'xhslink.com'];
  
  try {
    const parsedUrl = new URL(url)
    
    for (const domain of douyinDomains) {
      if (parsedUrl.host.includes(domain)) {
        return 'douyin'
      }
    }
    
    for (const domain of kuaishouDomains) {
      if (parsedUrl.host.includes(domain)) {
        return 'kuaishou'
      }
    }
    
    for (const domain of xiaohongshuDomains) {
      if (parsedUrl.host.includes(domain)) {
        return 'xiaohongshu'
      }
    }
  } catch (e) {
    return null
  }
  
  return null
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
  updateUserInfo,
  getUserInfo
}
