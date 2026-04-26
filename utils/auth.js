const API_BASE_URL = 'https://xxxxx.com'

const getAppInstance = () => {
  try {
    return getApp() || {}
  } catch (e) {
    return {}
  }
}

const getUserProfile = () => {
  return new Promise((resolve, reject) => {
    console.log('开始获取用户信息，弹出授权窗口...')
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('获取用户信息成功:', res.userInfo)
        if (res.userInfo) {
          resolve(res.userInfo)
        } else {
          reject(new Error('用户信息为空'))
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err)
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

const doLogin = async () => {
  try {
    console.log('=== 开始登录流程 ===')
    
    console.log('步骤1: 获取用户信息（昵称、头像）...')
    const userInfo = await getUserProfile()
    console.log('用户信息:', userInfo)
    
    console.log('步骤2: 获取登录code...')
    const code = await login()
    console.log('code:', code)
    
    console.log('步骤3: 发送到后端登录...')
    const result = await wechatLogin(code, userInfo.nickName, userInfo.avatarUrl)
    console.log('后端返回:', result)
    
    const loginData = {
      ...userInfo,
      openid: result.data.openid,
      userId: result.data.id,
      userToken: result.data.user_token
    }
    
    wx.setStorageSync('userInfo', loginData)
    wx.setStorageSync('isLoggedIn', true)
    wx.setStorageSync('openid', result.data.openid)
    
    console.log('=== 登录完成 ===')
    return loginData
  } catch (err) {
    console.error('登录失败:', err)
    throw err
  }
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

const doLoginWithManual = async (avatarUrl, nickname) => {
  try {
    console.log('=== 开始手动登录流程 ===')
    console.log('头像:', avatarUrl)
    console.log('昵称:', nickname)

    console.log('步骤1: 获取登录code...')
    const code = await login()
    console.log('code:', code)

    console.log('步骤2: 发送到后端登录...')
    const result = await wechatLogin(code, nickname, avatarUrl)
    console.log('后端返回:', result)

    const loginData = {
      avatarUrl: avatarUrl,
      nickName: nickname,
      openid: result.data.openid,
      userId: result.data.id,
      userToken: result.data.user_token
    }

    wx.setStorageSync('userInfo', loginData)
    wx.setStorageSync('isLoggedIn', true)
    wx.setStorageSync('openid', result.data.openid)

    console.log('=== 登录完成 ===')
    return { userId: result.data.id, userToken: result.data.user_token, openid: result.data.openid }
  } catch (err) {
    console.error('登录失败:', err)
    throw err
  }
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
  getStoredUserInfo,
  getStoredOpenid,
  doLoginWithManual
}
