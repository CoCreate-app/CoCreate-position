function position(el, container, options) {
  if (!(el && el.nodeType && el.nodeType === 1)) {
    return;
  }

  /** define constant **/
  this.dragAreaHeight = 50;
  this.MARGIN = 5;
  this.FULLSCREEN_MARGIN = -60;
  this.NO_SNAP = -100;
  this.SNAP_MARGIN = -10;
  this.RIGHT_SCROL = 5;

  this.container = container;
  if (!this.container.positionIndex)
    this.container.positionIndex = 10

  this.el = el;
  this.boundStatus = {};

  this.selectedElement;
  // this.selectedClass = "selectedPosition";
  /**
   * x: mouse x in element
   * y: mouse y in element
   * cx: x in document
   * cy: y in document
   * */
  this.point = {};
  this.rect = {};
  this.clickedInfo = null;
  this.preSnapped = null;
  this.isSnap = false;

  this._createGhost(this.container.getAttribute("data-ghost-class"));
  this._initEvent();
  this._selectElement()
}

position.prototype = {
  constructor: position,

  _initEvent: function () {
    let self = this;
    this.iframe = this.el.querySelector('iframe')
    if (this.iframe) {
      this.iframe.addEventListener('load', function () {
        const iframeContent = self.iframe.contentDocument;
        iframeContent.addEventListener('mousedown', function (e) {
          self._selectElement(e.detail.element)
        })
      });
    }

    this.el.addEventListener('touchstart', function (e) {
      self._selectElement(e.detail.element)
      self._onDown(e.touches[0]);
    })

    this.el.addEventListener('mousedown', function (e) {
      self._selectElement(e.detail.element)
      self._onDown(e);
    })

    this.el.addEventListener('mousemove', function (e) {
      e.preventDefault();
      self._onMove(e);
    });

    this.el.addEventListener('mouseup', function (e) {
      self._onUp(e);
      e.preventDefault();
    }, true);

    this.el.addEventListener('touchmove', function (e) {
      self._onMove(e.touches[0]);
    }, { passive: false });

    this.el.addEventListener('touchend', function (e) {
      self._onUp(e.touches[0]);
    }, { passive: false });

  },

  _onMove: function (e) {
    this.__getBoundStatus(e)
    this.__animate();
  },

  _onDown: function (e) {
    this.__getBoundStatus(e);

    this.clickedInfo = {
      x: this.point.x,
      y: this.point.y,
      cx: this.point.cx,
      cy: this.point.cy,
      w: this.rect.width,
      h: this.rect.height,
      isMoving: this._isMovable(),
      boundStatus: this.boundStatus,
      isChangeStart: true
    }
  },

  _onUp: function (e) {
    if (e) {
      this.__getBoundStatus(e);
    }
    if (!this.clickedInfo) {
      return;
    }
    if (this.clickedInfo.isMoving && !this.isParked) {
      let p_w = this.el.parentNode.offsetWidth, p_h = this.el.parentNode.offsetHeight;
      let snap_info = null;

      if (this.__between(this.rect.top, this.NO_SNAP, this.FULLSCREEN_MARGIN) ||
        this.__between(this.rect.left, this.NO_SNAP, this.FULLSCREEN_MARGIN) ||
        this.__between(p_w - this.rect.right, this.NO_SNAP, this.FULLSCREEN_MARGIN) ||
        this.__between(p_h - this.rect.bottom, this.NO_SNAP, this.FULLSCREEN_MARGIN)) {
        snap_info = { x: 0, y: 0, w: '100%', h: '100%' }
      } else if (this.__between(this.rect.top, this.NO_SNAP, this.SNAP_MARGIN)) {
        snap_info = { x: 0, y: 0, w: '100%', h: '50%' }
      } else if (this.__between(this.rect.left, this.NO_SNAP, this.SNAP_MARGIN)) {
        snap_info = { x: 0, y: 0, w: '50%', h: '100%' }
      } else if (this.__between(p_w - this.rect.right, this.NO_SNAP, this.SNAP_MARGIN)) {
        snap_info = { x: '50%', y: 0, w: '50%', h: '100%' }
      } else if (this.__between(p_h - this.rect.bottom, this.NO_SNAP, this.SNAP_MARGIN)) {
        snap_info = { x: 0, y: '50%', w: '100%', h: '50%' }
      }

      if (snap_info && !this.isSnap) {
        this.__setBound(this.el, snap_info.x, snap_info.y, snap_info.w, snap_info.h);
        this.preSnapped = { x: this.rect.x, y: this.rect.y, width: this.rect.width, height: this.rect.height };
        this.isSnap = true;
      }

      let ghost_info = {
        x: this.rect.x,
        y: this.rect.y,
        w: this.rect.width,
        h: this.rect.height
      }

      this._ghostProcess(ghost_info)
    }

    if (this.clickedInfo.isMoving) {
      this.createEvent('element-moveend');
    }


    this.clickedInfo = null;
  },

  __setBound: function (el, x, y, w, h) {
    el.style.left = x;
    el.style.top = y;
    el.style.width = w;
    el.style.height = h;
  },

  __setRectInfo: function () {
    let bound = this.el.getBoundingClientRect();
    let parentRect = this.el.parentNode.getBoundingClientRect();
    this.rect = {};
    this.rect.x = bound.x - parentRect.x;
    this.rect.y = bound.y - parentRect.y;
    this.rect.width = bound.width;
    this.rect.height = bound.height;
    this.rect.top = bound.top - parentRect.top;
    this.rect.bottom = bound.bottom - parentRect.top;
    this.rect.left = bound.left - parentRect.left;
    this.rect.right = bound.right - parentRect.left;
  },

  __getBoundStatus: function (e) {
    let bound = this.el.getBoundingClientRect();
    let parentRect = this.el.parentNode.getBoundingClientRect();
    let x = e.clientX - bound.left;// - parentRect.left;
    let y = e.clientY - bound.top;// - parentRect.top;

    this.__setRectInfo();

    this.point.x = x;
    this.point.y = y;
    this.point.cx = e.clientX - parentRect.left;
    this.point.cy = e.clientY - parentRect.top;

    this.boundStatus = {
      isTop: y < this.MARGIN && y > -this.MARGIN,
      isLeft: x < this.MARGIN && x > -this.MARGIN,
      isRight: x >= bound.width - this.RIGHT_SCROL && x <= bound.width + this.MARGIN + (this.MARGIN - this.RIGHT_SCROL),
      isBottom: y >= bound.height - this.MARGIN && y <= bound.height + this.MARGIN
    }

    return this.boundStatus;
  },

  __between: function (x, min, max) {
    return x >= min && x <= max;
  },

  __animate: function () {
    let c_info = this.clickedInfo;

    let eventName = null;

    if (c_info && c_info.isMoving) {
      /** 
       * Ghost Process
       **/

      let p_w = this.el.parentNode.offsetWidth, p_h = this.el.parentNode.offsetHeight;
      let ghost_info = null;

      if (this.__between(this.rect.top, this.NO_SNAP, this.FULLSCREEN_MARGIN) ||
        this.__between(this.rect.left, this.NO_SNAP, this.FULLSCREEN_MARGIN) ||
        this.__between(p_w - this.rect.right, this.NO_SNAP, this.FULLSCREEN_MARGIN) ||
        this.__between(p_h - this.rect.bottom, this.NO_SNAP, this.FULLSCREEN_MARGIN)) {
        ghost_info = { x: 0, y: 0, w: p_w, h: p_h, type: "show" }
      } else if (this.__between(this.rect.top, this.NO_SNAP, this.SNAP_MARGIN)) {
        ghost_info = { x: 0, y: 0, w: p_w, h: p_h / 2, type: "show" }
      } else if (this.__between(this.rect.left, this.NO_SNAP, this.SNAP_MARGIN)) {
        ghost_info = { x: 0, y: 0, w: p_w / 2, h: p_h, type: "show" }
      } else if (this.__between(p_w - this.rect.right, this.NO_SNAP, this.SNAP_MARGIN)) {
        ghost_info = { x: p_w / 2, y: 0, w: p_w / 2, h: p_h, type: "show" }
      } else if (this.__between(p_h - this.rect.bottom, this.NO_SNAP, this.SNAP_MARGIN)) {
        ghost_info = { x: 0, y: p_h / 2, w: p_w, h: p_h / 2, type: "show" }
      } else {
        ghost_info = { x: this.rect.left, y: this.rect.top, w: this.rect.width, h: this.rect.height, type: "hide" }
      }

      if (ghost_info && !this.isParked && !this.isSnap) {
        this._ghostProcess(ghost_info)
      }

      if (this.isSnap) {
        this.el.style.left = this.point.cx + 'px';
        this.el.style.top = this.point.cy + 'px';
        this.el.style.width = this.preSnapped.width + 'px';
        this.el.style.height = this.preSnapped.height + 'px';
        this.isSnap = false;
      } else {
        this.el.style.top = (this.point.cy - c_info.y) + 'px';
        this.el.style.left = (this.point.cx - c_info.x) + 'px';
      }

      eventName = "element-moving";
      if (c_info.isChangeStart) {
        this.clickedInfo.isChangeStart = false;
        eventName = "element-movestart";
      }

      this.createEvent(eventName)
      return;
    }
  },

  minMax() {
    if (!this.isSnap) {
      this.isSnap = true;
      this.preSnapped = { x: this.rect.x, y: this.rect.y, width: this.rect.width, height: this.rect.height };
      this.__setBound(this.el, 0, 0, "100%", "100%");
    } else {
      this.isSnap = false;
      this.el.style.left = this.preSnapped.x + 'px';
      this.el.style.top = this.preSnapped.y + 'px';
      this.el.style.width = this.preSnapped.width + 'px';
      this.el.style.height = this.preSnapped.height + 'px';
    }
  },

  _isMovable() {
    let width = this.rect.width;
    return this.point.x > 0 && this.point.x < width && this.point.y > 0 && this.point.y < this.dragAreaHeight;
  },

  /**
   * Position Events
   * move: element-moving, element-moveend, element-movestart
   **/
  createEvent(eventName) {
    const event = new CustomEvent(eventName, { detail: { element: this.el, instance: this } });
    this.el.dispatchEvent(event);
  },

  _createGhost: function (ghostClass) {
    let node = document.createElement("div");
    if (!ghostClass) {
      ghostClass = "snap-ghost";
    }

    node.classList.add(ghostClass);
    this.container.appendChild(node);
    this.ghostEl = node;
  },

  _ghostProcess: function (info) {
    this.ghostEl.style.left = info.x + 'px';
    this.ghostEl.style.top = info.y + 'px';
    this.ghostEl.style.width = info.w + 'px';
    this.ghostEl.style.height = info.h + 'px';

    if (info.type === "show") {
      if (this.ghostEl.style.display === 'none') {
        this.ghostEl.style.display = 'block'
      }
      this.ghostEl.style.opacity = 0.2;
    } else {
      this.ghostEl.style.opacity = 0;
      if (this.ghostEl.style.display !== 'none') {
        this.ghostEl.style.display = 'none'
      }
    }
    return;
  },

  _selectElement: function (el) {
    this._releaseSelect();
    this.container['selectedPositionElement'] = this.el
    if (this.el) {
      this.createEvent('elementSelected');
      this.el.style.zIndex = this.container.positionIndex += 1;
      this.el.classList.add('selectedPosition');
    }
  },

  _releaseSelect: function () {
    let el = this.container['selectedPositionElement']
    if (el)
      el.classList.remove("selectedPosition");
  },
}

export default position;