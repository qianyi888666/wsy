const api = require('../../../utils/api.js')

Page({
  data: {
    promotions: [],
    page: 1,
    limit: 20,
    hasMore: true,
    loading: false,
    searchKeyword: '',
    refreshing: false,
    refresh: false,
    scrollTop: 0
  },

  onLoad: function(options) {
    this.loadPromotions()
  },

  onShow: function() {
    this.setData({ page: 1, promotions: [], hasMore: true })
    this.loadPromotions()
  },

  setRefreshFlag: function() {
    this.setData({ refresh: true })
  },

  loadPromotions: function() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    api.getAllPromotions({
      page: this.data.page,
      limit: this.data.limit,
      keyword: this.data.searchKeyword
    }).then(res => {
      const listData = res.data.list || []
      const newList = this.data.page === 1 ? listData : [...this.data.promotions, ...listData]
      this.setData({
        promotions: newList,
        hasMore: listData.length >= this.data.limit,
        loading: false,
        refreshing: false
      })
    }).catch(err => {
      this.setData({ loading: false, refreshing: false })
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    })
  },

  distributeToColumns: function(list) {
    const leftColumn = []
    const rightColumn = []
    list.forEach((item, index) => {
      if (index % 2 === 0) {
        leftColumn.push(item)
      } else {
        rightColumn.push(item)
      }
    })
    this.setData({ leftColumn, rightColumn })
  },

  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearch: function() {
    this.setData({ page: 1, promotions: [], hasMore: true })
    this.loadPromotions()
  },

  onPullDownRefresh: function() {
    this.setData({ refreshing: true, page: 1, promotions: [], hasMore: true })
    this.loadPromotions()
    wx.stopPullDownRefresh()
  },

  onLoadMore: function() {
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.loadPromotions()
  },

  onCardTap: function(e) {
    const item = e.currentTarget.dataset.item
    
    if (!item.link) return
    
    if (item.link.startsWith('#小程序://')) {
      wx.navigateToMiniProgram({
        shortLink: item.link,
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes('cancel')) {
            wx.showToast({ title: '已取消跳转', icon: 'none' })
            return
          }
          wx.showToast({ title: '跳转失败: ' + err.errMsg, icon: 'none' })
        }
      })
    } else {
      wx.navigateTo({
        url: '/pages/webview/webview?url=' + encodeURIComponent(item.link)
      })
    }
  },

  onReachBottom: function() {
    this.onLoadMore()
  }
})
