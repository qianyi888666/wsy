const API_BASE_URL = 'https://xxxxxx.com/'

const getAppInstance = () => {
  try {
    return getApp() || {}
  } catch (e) {
    return {}
  }
}

const getUserProfile = () => {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        if (res.userInfo) {
          resolve(res.userInfo)
        } else {
          reject(new Error('用户信息为空'))
        }
      },
      fail: (err) => {
        const errorMsg = err.errMsg || ''
        if (errorMsg.includes('auth deny') || errorMsg.includes('auth denied')) {
          reject(new Error('您已拒绝授权，无法获取昵称和头像'))
        } else if (errorMsg.includes('fail')) {
          reject(new Error('授权失败，请重试'))
        } else {
          reject(err)
        }
      }
    })
  })
}

const login = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code)
        } else {
          reject(new Error('获取code失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

const wechatLogin = (code, nickname, avatar_url) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}api.php?action=wechat_login`,
      method: 'GET',
      data: {
        code: code,
        nickname: nickname || '',
        avatar_url: avatar_url || ''
      },
      success: (res) => {
        if (res.data && res.data.success) {
          resolve(res.data)
        } else {
          reject(res.data || { message: '登录失败' })
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

const getUserInfo = (openid) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}api.php?action=get_user_info&openid=${openid}`,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.success) {
          resolve(res.data)
        } else {
          reject(res.data || { message: '获取用户信息失败' })
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

const uploadAvatar = (avatarPath, openid) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE_URL}api.php?action=upload_avatar`,
      filePath: avatarPath,
      name: 'avatar',
      formData: {
        openid: openid
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data && data.success) {
            resolve(data)
          } else {
            reject(data || { message: '上传头像失败' })
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

const doLogin = () => {
  return new Promise((resolve, reject) => {
    let userInfo = null

    getUserProfile()
      .then((info) => {
        userInfo = info

        return login()
      })
      .then((code) => {

        return wechatLogin(code, userInfo.nickName, userInfo.avatarUrl)
      })
      .then((result) => {

        const loginData = {
          openid: result.data.openid,
          userId: result.data.id,
          userToken: result.data.user_token,
          nickname: result.data.nickname || result.data.nickName || '微信用户',
          avatar: result.data.avatar_url || result.data.avatarUrl || '/images/default-avatar.png',
          loginTime: Date.now()
        }

        wx.setStorageSync('userInfo', loginData)
        wx.setStorageSync('isLoggedIn', true)
        wx.setStorageSync('openid', result.data.openid)

        resolve(loginData)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

const checkTokenExpiry = () => {
  const userInfo = wx.getStorageSync('userInfo')
  if (!userInfo || !userInfo.loginTime) {
    return false
  }
  const TOKEN_EXPIRE_MS = 10 * 60 * 1000
  const now = Date.now()
  if (now - userInfo.loginTime > TOKEN_EXPIRE_MS) {
    logout()
    return true
  }
  return false
}

const logout = () => {
  wx.removeStorageSync('isLoggedIn')
  wx.removeStorageSync('userInfo')
  wx.removeStorageSync('openid')
  wx.removeStorageSync('localUserInfo')

  const app = getAppInstance()
  if (app.globalData) {
    app.globalData.userInfo = null
    app.globalData.isLoggedIn = false
  }
}

const getUserToken = () => {
  const userInfo = wx.getStorageSync('userInfo')
  return userInfo ? (userInfo.userToken || userInfo.userId || null) : null
}

const checkLoginStatus = () => {
  const isLoggedIn = wx.getStorageSync('isLoggedIn')
  const userInfo = wx.getStorageSync('userInfo')
  
  if (isLoggedIn && userInfo) {
    const app = getAppInstance()
    if (app.globalData) {
      app.globalData.userInfo = userInfo
      app.globalData.isLoggedIn = true
    }
    return true
  }
  return false
}

const getStoredUserInfo = () => {
  return wx.getStorageSync('userInfo') || null
}

const getStoredOpenid = () => {
  return wx.getStorageSync('openid') || null
}

const doLoginWithManual = (avatarUrl, nickname) => {
  return new Promise((resolve, reject) => {
    login()
      .then((code) => {
        return wechatLogin(code, nickname, avatarUrl)
      })
      .then((result) => {
        const loginData = {
          avatarUrl: avatarUrl,
          nickName: nickname,
          openid: result.data.openid,
          userId: result.data.id,
          userToken: result.data.user_token,
          loginTime: Date.now()
        }

        wx.setStorageSync('userInfo', loginData)
        wx.setStorageSync('isLoggedIn', true)
        wx.setStorageSync('openid', result.data.openid)

        resolve({ userId: result.data.id, userToken: result.data.user_token, openid: result.data.openid })
      })
      .catch((err) => {
        reject(err)
      })
})
}

module.exports = {
  getUserProfile,
  login,
  wechatLogin,
  getUserInfo,
  uploadAvatar,
  doLogin,
  logout,
  checkLoginStatus,
  getUserToken,
  getStoredUserInfo,
  getStoredOpenid,
  doLoginWithManual,
  checkTokenExpiry
}
