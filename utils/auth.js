/**
 * 微信登录工具函数
 * 用于处理微信小程序的登录流程
 */

const API_BASE_URL = 'https://dy.qyhlq.top/douyin/'

const getAppInstance = () => {
  try {
    return getApp() || {}
  } catch (e) {
    return {}
  }
}

/**
 * 获取微信用户信息（昵称、头像）
 * 注意：每次调用都会弹出授权框
 * @returns {Promise}
 */
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

/**
 * 小程序登录，获取code
 * @returns {Promise<string>} code
 */
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

/**
 * 发送到后端登录
 * @param {string} code 微信登录code
 * @param {string} nickname 用户昵称
 * @param {string} avatar_url 头像URL
 * @returns {Promise}
 */
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

/**
 * 根据openid获取用户信息
 * @param {string} openid 用户openid
 * @returns {Promise}
 */
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

/**
 * 上传头像到服务器
 * @param {string} avatarPath 头像临时路径
 * @param {string} openid 用户openid
 * @returns {Promise<Object>} 上传结果
 */
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

/**
 * 完整的微信登录流程
 * @returns {Promise<Object>} 用户信息
 */
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

/**
 * 退出登录
 */
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

/**
 * 检查登录状态
 * @returns {boolean}
 */
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

/**
 * 获取本地存储的用户信息
 * @returns {Object|null}
 */
const getStoredUserInfo = () => {
  return wx.getStorageSync('userInfo') || null
}

/**
 * 获取本地存储的openid
 * @returns {string|null}
 */
const getStoredOpenid = () => {
  return wx.getStorageSync('openid') || null
}

/**
 * 手动填写信息的登录流程
 * @param {string} avatarUrl 用户选择的头像临时路径
 * @param {string} nickname 用户输入的昵称
 * @returns {Promise<Object>} 登录结果
 */
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

/**
 * 一键登录流程（先获取openid，后端判断是否需要完善信息）
 * @returns {Promise<Object>} 登录结果，包含 needComplete 字段
 */
const quickLogin = async () => {
  try {
    console.log('=== 开始一键登录流程 ===')

    console.log('步骤1: 获取登录code...')
    const code = await login()
    console.log('code:', code)

    console.log('步骤2: 发送到后端登录...')
    const result = await wechatLogin(code, '', '')
    console.log('后端返回:', result)

    const openid = result.data.openid
    const userId = result.data.id

    if (result.data.need_complete) {
      console.log('需要完善信息')
      return {
        needComplete: true,
        openid: openid,
        userId: userId
      }
    } else {
      console.log('登录成功，有完整信息')
      const loginData = {
        avatarUrl: result.data.avatar_url || '/images/default-avatar.png',
        nickName: result.data.nickname || '用户',
        openid: openid,
        userId: userId,
        userToken: result.data.user_token
      }

      wx.setStorageSync('userInfo', loginData)
      wx.setStorageSync('isLoggedIn', true)
      wx.setStorageSync('openid', openid)

      console.log('=== 一键登录完成 ===')
      return {
        needComplete: false,
        avatarUrl: loginData.avatarUrl,
        nickName: loginData.nickName,
        userId: userId,
        userToken: result.data.user_token
      }
    }
  } catch (err) {
    console.error('一键登录失败:', err)
    throw err
  }
}

/**
 * 自动登录流程（从数据库获取用户信息）
 * 适用于非首次登录，直接用code换openid，然后从数据库获取用户信息
 * @returns {Promise<Object>} 用户信息
 */
const autoLogin = async () => {
  try {
    console.log('=== 开始自动登录流程 ===')

    console.log('步骤1: 获取登录code...')
    const code = await login()
    console.log('code:', code)

    console.log('步骤2: 发送到后端登录...')
    const result = await wechatLogin(code, '', '')
    console.log('后端返回:', result)

    const openid = result.data.openid
    const userId = result.data.id

    console.log('步骤3: 从数据库获取用户信息...')
    const userInfoResult = await getUserInfo(openid)
    console.log('用户信息:', userInfoResult)

    const userData = userInfoResult.data
    const loginData = {
      avatarUrl: userData.avatar_url || '/images/default-avatar.png',
      nickName: userData.nickname || '用户',
      openid: openid,
      userId: userId,
      userToken: userData.user_token
    }

    wx.setStorageSync('userInfo', loginData)
    wx.setStorageSync('isLoggedIn', true)
    wx.setStorageSync('openid', openid)

    console.log('=== 自动登录完成 ===')
    return loginData
  } catch (err) {
    console.error('自动登录失败:', err)
    throw err
  }
}

const getUserId = () => {
  const userInfo = wx.getStorageSync('userInfo')
  return userInfo ? userInfo.userId : null
}

const getUserToken = () => {
  const userInfo = wx.getStorageSync('userInfo')
  return userInfo ? (userInfo.userToken || userInfo.userId) : null
}

module.exports = {
  getUserProfile,
  login,
  wechatLogin,
  getUserInfo,
  uploadAvatar,
  doLogin,
  doLoginWithManual,
  quickLogin,
  autoLogin,
  logout,
  checkLoginStatus,
  getStoredUserInfo,
  getStoredOpenid,
  getUserId,
  getUserToken
}
