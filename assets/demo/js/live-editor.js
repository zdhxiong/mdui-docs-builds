/*!
 * LiveEditor (https://www.mdui.org)
 * Copyright 2016-2016 zdhxiong
 */

var LiveEditor = (function () {
  'use strict';

  var $ = {};

  /**
   * 是否是数组
   * @param arr
   * @returns {boolean}
   */
  $.isArray = function (arr) {
    return Object.prototype.toString.apply(arr) === '[object Array]';
  };

  /**
   * nodeList 转换为数组
   * @param nodeList
   * @returns {Array}
   */
  $.toArray = function (nodeList) {
    var i;
    var arr = [];
    for (i = 0; i < nodeList.length; i++) {
      if (nodeList[i]) {
        arr.push(nodeList[i]);
      }
    }

    return arr;
  };

  /**
   * 循环数组或对象
   * @param obj
   * @param callback
   */
  $.each = function (obj, callback) {
    var i;
    var prop;
    if (!obj) {
      return;
    }

    if ($.isArray(obj)) {
      // Array
      for (i = 0; i < obj.length; i++) {
        if (callback(i, obj[i]) === false) {
          break;
        }
      }
    } else {
      // Object
      for (prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          if (callback(prop, obj[prop]) === false) {
            break;
          }
        }
      }
    }
  };

  /**
   * 函数节流
   * @param fn
   * @param delay
   * @returns {Function}
   */
  $.throttle = function (fn, delay) {
    var timer = null;

    return function () {
      var _this = this;
      var args = arguments;

      if (timer === null) {
        timer = setTimeout(function () {
          fn.apply(_this, args);
          timer = null;
        }, delay);
      }
    };
  };

  /**
   * 发送 ajax 请求
   * @param data
   */
  $.ajax = function(data) {
    if (typeof data === "object") {
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
          data.success(xmlhttp);
        }
      };
      xmlhttp.open(data.type, data.url, false);
      xmlhttp.send();
    }
  };

  // DOM 元素缓存
  var dom = {
    controlsDrag: document.querySelector('.editor-controls-drag'),
    preview: document.querySelector('.preview-container'),
    panel: document.querySelector('.editor-panel'),
    controls: document.querySelector('.editor-controls'),
    editorContainers: document.querySelectorAll('.editor-container'),

    editorContainerHTML: document.querySelector('.editor-container-html'),
    editorContainerCSS: document.querySelector('.editor-container-css'),
    editorContainerJS: document.querySelector('.editor-container-js'),

    controlHTML: document.querySelector('.editor-control-html'),
    controlCSS: document.querySelector('.editor-control-css'),
    controlJS: document.querySelector('.editor-control-js'),

    controlLiveMode: document.querySelector('.editor-controls-live-mode input[type="checkbox"]'),
  };

  // 编辑器
  var editor = {
    html: ace.edit('editor-ace-html'),
    css: ace.edit('editor-ace-css'),
    js: ace.edit('editor-ace-js'),
  };

  var editors = [
    {
      inst: editor.html,
      mode: 'html'
    },
    {
      inst: editor.css,
      mode: 'css'
    },
    {
      inst: editor.js,
      mode: 'javascript'
    }
  ];

  /**
   * 编辑器
   * @constructor
   */
  function LiveEditor () {
    var _this = this;
    ace.require("ace/ext/language_tools");
    _this.init();
  }

  /**
   * 初始化
   */
  LiveEditor.prototype.init = function () {
    var _this = this;

    _this.resizePanel();

    // 初始化编辑器
    $.each(editors, function (i, editor) {
      editor.inst.setTheme('ace/theme/chrome');
      editor.inst.getSession().setMode('ace/mode/' + editor.mode);
      editor.inst.getSession().setTabSize(2);                         // 缩进两个字符
      editor.inst.getSession().setUseSoftTabs(true);                  // 使用空格缩进
      editor.inst.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
      });
      editor.inst.setShowPrintMargin(false);                          // 不显示打印线
      editor.inst.setFontSize(14);                                    // 字体 14px
      editor.inst.renderer.setShowGutter(false);                      // 不显示行号
      editor.inst.resize(true);
    });

    _this.hotkey();

    _this.isShowHTML = true;
    _this.isShowCSS = true;
    _this.isShowJS = true;

    // 编辑器显示状态
    if (dom.controlHTML.classList.contains('editor-control-active')) {
      _this.showHTML();
    } else {
      _this.hideHTML();
    }
    if (dom.controlCSS.classList.contains('editor-control-active')) {
      _this.showCSS();
    } else {
      _this.hideCSS();
    }
    if (dom.controlJS.classList.contains('editor-control-active')) {
      _this.showJS();
    } else {
      _this.hideJS();
    }

    // Live Mode
    _this.isLiveMode = dom.controlLiveMode.checked;
    _this.liveMode();

    // 绑定面板拖动事件
    _this.resizePanelEvent();

    window.addEventListener('resize', function () {
      _this.resizePanel();
    });

    _this.run();
  };

  /**
   * 绑定快捷键
   */
  LiveEditor.prototype.hotkey = function () {
    var _this = this;

    // Ctrl + enter 运行
    document.addEventListener('keydown', function (e) {
      e = e || window.event;
      var keyCode = e.keyCode || e.charCode;
      if (keyCode === 13 && e.ctrlKey) {
        _this.run();
      }
    });
  };

  /**
   * 设置或取消 LiveMode
   */
  LiveEditor.prototype.liveMode = function () {
    var _this = this;

    $.each(editors, function (i, editor) {
      editor.inst.on('change', $.throttle(function () {
        if (_this.isLiveMode) {
          _this.run();
        }
      }, 500));
    });
  };

  /**
   * 修改面板高度
   * @param Top 面板距离页面顶部的距离
   */
  LiveEditor.prototype.resizePanel = function (Top) {
    var _this = this;

    if (typeof Top === 'undefined') {

      // 在小屏幕设备上隐藏面板
      if (window.innerWidth < 600) {
        dom.preview.style.height = document.body.offsetHeight + 'px';
        dom.panel.style.display = 'none';

        return;
      }

      Top = document.body.offsetHeight / 2;
    }

    var previewHeight = Top;
    var panelHeight = document.body.offsetHeight - Top;
    var controlsHeight = dom.controls.offsetHeight;

    dom.preview.style.height = previewHeight + 'px';
    dom.panel.style.display = 'block';
    dom.panel.style.height = panelHeight + 'px';
    $.each(dom.editorContainers, function (i, editorContainer) {
      editorContainer.style.height = panelHeight - controlsHeight + 'px';
    });
    $.each(editors, function (e, editor) {
      editor.inst.resize();
    });
  };

  /**
   * 绑定拖拽面板高度事件
   */
  LiveEditor.prototype.resizePanelEvent = function () {
    var _this = this;

    dom.controlsDrag.onmousedown = function (e) {
      var panelTopOrigin = dom.panel.offsetTop;
      var tempHeight = e.clientY - panelTopOrigin;
      document.onmousemove = function (e) {
        e.preventDefault();

        var mouseTop = e.clientY;
        var Top = mouseTop - tempHeight;

        // 避免面板超出页面可见区域
        if (Top + dom.controls.offsetHeight + 40 < document.body.offsetHeight && Top >= 0) {
          _this.resizePanel(Top);
        }
      };
      document.onmouseup = function (e) {
        document.onmousemove = null;
      };
    };
  };

  /**
   * 设置编辑器的宽度
   * @param width
   * @private
   */
  LiveEditor.prototype._setEditorWidth = function (width) {
    dom.editorContainerHTML.style.width =
      dom.editorContainerCSS.style.width =
        dom.editorContainerJS.style.width = width;
  };

  /**
   * 调整编辑器的宽度
   */
  LiveEditor.prototype.resizeEditor = function () {
    var _this = this;

    var showCount = 0;
    _this.isShowHTML && showCount++;
    _this.isShowCSS && showCount++;
    _this.isShowJS && showCount++;

    if (showCount === 3) {
      _this._setEditorWidth('33.333333%');
    } else if (showCount === 2) {
      _this._setEditorWidth('50%');
    } else if (showCount === 1) {
      _this._setEditorWidth('100%');
    }

    _this.isShowHTML && editor.html.resize();
    _this.isShowCSS && editor.css.resize();
    _this.isShowJS && editor.js.resize();
  };

  /**
   * 显示 HTML 编辑器
   */
  LiveEditor.prototype.showHTML = function () {
    var _this = this;

    dom.controlHTML.classList.add('editor-control-active');
    dom.editorContainerHTML.style.display = 'block';
    editor.html.resize();
    _this.isShowHTML = true;

    _this.resizeEditor();
  };

  /**
   * 隐藏 HTML 编辑器
   */
  LiveEditor.prototype.hideHTML = function () {
    var _this = this;

    dom.controlHTML.classList.remove('editor-control-active');
    dom.editorContainerHTML.style.display = 'none';
    _this.isShowHTML = false;

    _this.resizeEditor();
  };

  /**
   * 切换 HTML 编辑器
   */
  LiveEditor.prototype.toogleHTML = function () {
    var _this = this;

    if (dom.controlHTML.classList.contains('editor-control-active')) {
      _this.hideHTML();
    } else {
      _this.showHTML();
    }
  };

  /**
   * 显示 CSS 编辑器
   */
  LiveEditor.prototype.showCSS = function () {
    var _this = this;

    dom.controlCSS.classList.add('editor-control-active');
    dom.editorContainerCSS.style.display = 'block';
    editor.css.resize();
    _this.isShowCSS = true;

    _this.resizeEditor();
  };

  /**
   * 隐藏 CSS 编辑器
   */
  LiveEditor.prototype.hideCSS = function () {
    var _this = this;

    dom.controlCSS.classList.remove('editor-control-active');
    dom.editorContainerCSS.style.display = 'none';
    _this.isShowCSS = false;

    _this.resizeEditor();
  };

  /**
   * 切换 CSS 编辑器
   */
  LiveEditor.prototype.toogleCSS = function () {
    var _this = this;

    if (dom.controlCSS.classList.contains('editor-control-active')) {
      _this.hideCSS();
    } else {
      _this.showCSS();
    }
  };

  /**
   * 显示 JS 编辑器
   */
  LiveEditor.prototype.showJS = function () {
    var _this = this;

    dom.controlJS.classList.add('editor-control-active');
    dom.editorContainerJS.style.display = 'block';
    editor.js.resize();
    _this.isShowJS = true;

    _this.resizeEditor();
  };

  /**
   * 隐藏 JS 编辑器
   */
  LiveEditor.prototype.hideJS = function () {
    var _this = this;

    dom.controlJS.classList.remove('editor-control-active');
    dom.editorContainerJS.style.display = 'none';
    _this.isShowJS = false;

    _this.resizeEditor();
  };

  /**
   * 切换 JS 编辑器
   */
  LiveEditor.prototype.toogleJS = function () {
    var _this = this;

    if (dom.controlJS.classList.contains('editor-control-active')) {
      _this.hideJS();
    } else {
      _this.showJS();
    }
  };

  /**
   * Live Mode 切换
   */
  LiveEditor.prototype.toogleLiveMode = function () {
    var _this = this;

    dom.controlLiveMode.checked = _this.isLiveMode = !_this.isLiveMode;
    _this.liveMode();
  };

  /**
   * 运行代码
   */
  LiveEditor.prototype.run = function () {
    var _this = this;

    var html = editor.html.getValue();
    var css = editor.css.getValue();
    var js = editor.js.getValue();

    // 移除旧的 iframe
    var iframeEle = document.getElementById('preview-iframe');
    if (iframeEle) {
      iframeEle.parentNode.removeChild(iframeEle);
    }

    // 添加新的 iframe
    var tempParent = document.createElement('div');
    tempParent.innerHTML = '<iframe id="preview-iframe" sandbox="allow-modals allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts" name="iframe" frameborder="0"></iframe>';
    iframeEle = $.toArray(tempParent.childNodes)[0];
    dom.preview.appendChild(iframeEle);

    var iframe = iframeEle.contentDocument || iframeEle.contentWindow.document;
    iframe.open();
    iframe.write(html + '<style>' + css + '</style>' + '<script>' + js + '</script>');
    iframe.close();
  };

  /**
   * 下载代码
   */
  LiveEditor.prototype.download = function () {

  };

  return LiveEditor;

})();
