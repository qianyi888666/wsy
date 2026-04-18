/**
 * @fileoverview 自定义底部导航栏组件
 * @description 提供去水印和个人中心两个Tab切换功能
 * @author 小程
 * @version 1.0.0
 */

Component({
  /**
   * 组件属性
   */
  properties: {
    currentIndex: {
      type: Number,
      value: 0
    }
  },

  /**
   * 组件数据
   */
  data: {},

  /**
   * 组件方法
   */
  methods: {
    /**
     * Tab点击事件
     * @param {Object} e - 事件对象
     * @returns {void}
     */
    onTabTap: function(e) {
      const index = parseInt(e.currentTarget.dataset.index);
      
      if (index === this.data.currentIndex) {
        return;
      }

      if (index === 0) {
        wx.switchTab({
          url: '/pages/index/index'
        });
      } else if (index === 1) {
        wx.switchTab({
          url: '/pages/promotion/index/index'
        });
      } else if (index === 2) {
        wx.switchTab({
          url: '/pages/profile/profile'
        });
      }
    }
  }
});
