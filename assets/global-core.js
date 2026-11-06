/* 物自体（Noumena）归因总开关 - start */
/**
 * 贵方「全局APP配置」里的 Enable Noumena Attribution
 * （head-global-js-variables.liquid → window.pageInfo.app.noumena_attribution_enable）。
 *
 * 🔴 主题里我方的每一处代码都过这一道，**判据只此一处** ——
 *    日后要改判据（换键名、加条件、临时全关），改这一行即可，不必去找那 10 个调用点。
 *
 * 判据是严格 === true：开关缺席、undefined、false、字符串 "true" 一律返回 false。
 *
 * 挂在 window 上而不是导出，是因为调用方分布在三种载体里：本文件、webpack 打包的
 * src/components/**，以及 theme/snippets/*.liquid 里的内联 JS —— 后两者 import 不到这里。
 *
 * 可用性与 window.pageInfo 完全同步：二者由同一对 snippet 的相邻两行提供
 * （theme-page-entry.liquid:38/41、common-head.liquid:32/35）⇒ 有 pageInfo 的页面必有本函数；
 * 没有的页面（checkout / password 两个 layout）开关判据本来就恒 false，此时本函数缺席
 * 导致的「不执行」与内联判据的结果一致。
 */
window.__nmEnabled = () => window?.pageInfo?.app?.noumena_attribution_enable === true;
/* 物自体（Noumena）归因总开关 - end */

/* 发布订阅标准事件名 - start */
const PUB_SUB_EVENTS = {
  cartUpdate: 'cart-update',
  quantityUpdate: 'quantity-update',
  optionValueSelectionChange: 'option-value-selection-change',
  variantChange: 'variant-change',
  videoPlay: 'jky-video-paly'
};
/* 发布订阅标准事件名 - end */

const jkyUtils = (function () {
  return {
    /* 页面禁用滚动 */
    disablePageScroll: function() { // 页面禁用滚动
      if (document.body.classList.contains('overflow-hidden')) return
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.classList.add('overflow-hidden');
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = scrollBarWidth + "px";
      }
    },
    /**
     * 重新启用页面滚动(解除disablePageScroll的效果)
     */
    enablePageScroll: function() {
      if (!document.body.classList.contains('overflow-hidden')) return;
      document.body.classList.remove('overflow-hidden');
      document.body.style.paddingRight = "";
    }
  }
})();


/* 全局发布订阅事件管理 - start */
let subscribers = {};

function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) { subscribers[eventName] = []; }
  subscribers[eventName] = [...subscribers[eventName], callback];

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter((cb) => { return cb !== callback; });
  };
}

function publish(eventName, data) {
  if (subscribers[eventName]) {
    subscribers[eventName].forEach((callback) => { callback(data); });
  }
}
/* 全局发布订阅事件管理 - end */


/* 通用Fetch - start */
function fetchConfig(method = 'POST') {
  return {
    method,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      Accept: `application/json`,
      cr: pageInfo?.cr || 'US',
      lang: pageInfo?.lang || 'en'
    }
  };
}

function formatFetchUrl() {
  const env = pageInfo?.env || 'prod';
  const urls = {
    prod: 'https://api.myjackery.com',
    uat: 'https://api-uat.myjackery.com',
    demo: 'https://demo-api.myjackery.com'
  };
  return urls[env] || urls.prod;
}
/* 通用Fetch - end */


/* common utils - start */
function getUrlQueryParams(key = '') {
  if (typeof location === 'undefined') {
    console.error('getUrlQueryParams Error: location object is not available.');
    return key ? undefined : {};
  }
  const res = {};
  new URLSearchParams(location.search).forEach((v, k) => res[k] = v);
  return key ? res[key] : res;
}

function debounce(func, wait = 100) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout),
      timeout = setTimeout(() => func.apply(this, args), wait);
  }
}

function throttle(fn, delay) {
  let timer;
  return function () {
    if (!timer) {
      timer = setTimeout(() => {
        fn.apply(this, arguments);
        timer = null;
      }, delay);
    }
  }
}

function formatMoney(cents, format) {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  var value = '';
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = format || window?.pageInfo?.currency?.money_format;

  function formatWithDelimiters(number) {
    var precision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    var thousands = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ',';
    var decimal = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '.';

    if (isNaN(number) || number == null) {
      return 0;
    }

    if(precision === 0) {
      number = Math.floor(number / 100.0)
      number = String(number)
    } else {
      number = (number / 100.0).toFixed(precision);
    }

    var parts = number.split('.');
    var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
    var centsAmount = parts[1] ? decimal + parts[1] : '';

    return dollarsAmount + centsAmount;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_with_space_separator':
      value = formatWithDelimiters(cents, 2, ' ', ',');
      break;
    case 'amount_no_decimals_with_space_separator':
      value = formatWithDelimiters(cents, 0, ' ', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
    default:
      value = formatWithDelimiters(cents, 2); // 默认以“,”分隔
  }

  return formatString.replace(placeholderRegex, value);
}

function formatNoDecimalsMoney() {
  const moneyFormat = window?.pageInfo?.currency?.money_format;
  if (!moneyFormat) return '';

  return moneyFormat
    .replace('{{amount}}', '{{amount_no_decimals}}')
    .replace('{{amount_with_comma_separator}}', '{{amount_no_decimals_with_comma_separator}}')
    .replace('{{amount_with_space_separator}}', '{{amount_no_decimals_with_space_separator}}');
}

async function copyString(value, cb) {
  if (!navigator.clipboard?.writeText) {
    console.warn('当前环境不支持剪贴板 API（可能非 HTTPS 安全上下文）');
    cb && cb(false);
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    cb && cb(true); // 成功回调
  } catch (err) {
    console.error('复制失败:', err);
    cb && cb(false); // 失败回调
  }
}

  /**
 * 全局工具方法
 */
// 判断元素是否正常显示
function isElementVisible(element) {
  if (!element || !document.body.contains(element)) return false;
  let current = element;
  do {
    if (window.getComputedStyle(current).display === 'none') return false;
    current = current.parentElement;
  } while (current);
  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  );
}

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 返回验证结果
 */
function validateEmail(email) {
  return /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(email);
}
/* common utils - end */

/**
 * 异步加载css
 * @param {string} url - css url
 */
function loadCSS(url, callback) {
  if (document.querySelector(`link[href="${url}"][rel="stylesheet"]`)) {
    callback && callback();
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;

  link.onload = function () {
    callback && callback();
  };

  link.onerror = function () {
    console.error('Failed to loadCSS: ' + url);
  };

  document.head.appendChild(link);
}

/**
 * 懒加载执行js
 * @param {Element} element
 * @param {Function} callback
 * @param {Number} threshold
 */
function initLazyScript(element, callback, threshold = 300) {
  if (!element) {
    typeof callback === 'function' && callback();
    return;
  }

  if (!("IntersectionObserver" in window)) {
    typeof callback === 'function' && callback();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || typeof callback !== 'function') return;

      callback();
      observer.unobserve(entry.target);
      observer.disconnect();
    });
  }, {
    rootMargin: `0px 0px ${threshold}px 0px`
  });

  observer.observe(element);
}

/* 元素焦点管理 - start */
const trapFocusHandlers = {};

function getFocusableElements(container) { // 获取可聚焦元素
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  )
}

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];
  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;
    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return;
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);
  if (elementToFocus) elementToFocus.focus();
}

/* 元素焦点管理 - end */

/* Shopify common script - start */
typeof window.Shopify > "u" && (window.Shopify = {});
/* Shopify common script - end */

// 获取 滚动条 宽度
function getScrollBarWidth() {
  const rootStyles = getComputedStyle(document.documentElement);
  return rootStyles.getPropertyValue('--scroll-bar-width');
}

// 设置 内容区域 宽度，防止 页面闪烁
function setContentWidth() {
  if (document.body.classList.contains('overflow-hidden')) return
  document.body.classList.add('overflow-hidden');

  if (window.innerWidth <= 1024) return
  const scrollBarWidth = getScrollBarWidth()
  document.body.style.paddingRight = scrollBarWidth;
}

// 恢复 内容区域 宽度
function resetContentWidth() {
  if (!document.body.classList.contains('overflow-hidden')) return

  // 查找所有弹窗
  const modalList = document.querySelectorAll('.modal-container.modal')
  // 检查是否所有弹窗都已关闭
  const allModalsClosed = Array.from(modalList).every(item => item.style.display === 'none')
  // 只有当所有弹窗都关闭时，才恢复body滚动
  if (allModalsClosed) {
    document.body.classList.remove('overflow-hidden');

    if (window.innerWidth <= 1024) return
    document.body.style.paddingRight = 0;
  }
}


// 各站点 storefrontAccessToken
const STOREFRONT_ACCESS_TOKEN = new Map([
  ['localhost', '08defaa91b45739dabbffc832d38a840'], // demo us 本地
  // ['localhost', '2601a17adc7213e7797a277bb896b491'], // demo us 本地，跳 checkout 会提示库存不足
  ['shop.sit-eu.jackery.com', '08defaa91b45739dabbffc832d38a840'], // demo us
  // ['shop.sit-eu.jackery.com', '2601a17adc7213e7797a277bb896b491'], // demo us，跳 checkout 会提示库存不足
  ['shop.sit-jp.jackery.jp', '0266aec2eb519d5248900b1ba51fe4b1'], // demo jp
  ['shop.uat-us.jackery.com', '093e86307a6b0efafd65021527b4c1f1'], // uat us
  ['www.jackery.com', 'e2a57b2ebbb0a5e04466f5d8567bca90'], // us
  ['de.jackery.com', 'ee55fef5baa5c56a40614cb839f6419d'], // de
  ['www.jackery.jp', 'a927af62fe55976f73b69231b91c88bb'], // jp
  ['uk.jackery.com', '7d8f22b6071a6819aec2a8a2d8b4ecbc'], // uk
  ['ca.jackery.com', '5ce809c34718f7b4b93eab5acc1725c1'], // ca
  ['au.jackery.com', 'ac20c26499e70e8ea84cf8a99034669c'], // au
  ['fr.jackery.com', 'bb81ff0958cf730357e5f60fedb1224f'], // fr
  ['eu.jackery.com', '652f4daa5b46fa2afd9cce57e7964d22'], // eu
  ['es.jackery.com', '4f9bcf9d8c8007055ba1e9501df58abe'], // es
  ['nl.jackery.com', '660c27fb0fdef8a6bca346f423da461d'], // nl
  ['it.jackery.com', '4c57000fbd398fbbdd6ae11c1a641cc8'], // it
])

/**
 * 创建独立购物车并跳转到结账页面，只需要开checkout的【只读】权限即可
 * @param {Array} items - 商品列表数组，每个商品包含 quantity, id, properties
 * @param {Object} properties - 属性，一般用来记录标签。兜底链接跳转时会用到
 * @returns {Promise<string>} 结账 URL
 */
async function createCartAndCheckout(items, properties) {
  if (!Array.isArray(items)) {
    console.error('[createCartAndCheckout] Parameter validation failed: Expected an array');
    return Promise.reject(new Error('Invalid items'));
  }

  const hostname = window.location.hostname;
  const storefrontAccessToken = STOREFRONT_ACCESS_TOKEN.get(hostname);
  if (!storefrontAccessToken) {
    console.error('[createCartAndCheckout] No Storefront Access Token found for hostname:', hostname);
    return Promise.reject(new Error('Missing access token'));
  }

  // 获取归因标识：Promi 属性 + 物自体（Noumena）归因标识
  //
  // ⚠️ 这个变量现在装的是两边的键。将来下掉 Promi 时不要整行删除 ——
  //    否则 __nm_vid / __nm_ctx 会跟着一起消失，而这个特性的失败形态是无声的。
  //
  // 🔴 灰度总开关：走本文件顶部那一处 window.__nmEnabled()（判据只定义在那里，
  //    主题里我方 10 个点全用它）。开关不为 true 时下面整段被跳过 ——
  //    不产生任何等待，也不调用我方接口。
  //
  // 归因标识可能在页面生命周期中才就绪（同意态确认后才签发），所以这里调用取值函数、
  // 而不是读一个静态对象。四道兜底（embed 缺席 / 旧版无此方法 / 抛异常或 reject /
  // 挂住不返回）任一条成立都退回改动前的行为：照常下单，只是这一单少了归因标识。
  // 逐条对应见本次提交说明。
  const nmEnabled = window.__nmEnabled?.() === true;
  const NM_TIMEOUT_MS = 500;   // 传给接口的等待上限；其契约允许 200~3000，超出按边界截断
  const NM_CUTOFF_MS = 700;    // 本地硬切断，留 200ms 余量不抢接口自己的超时
  let nmCartAttributes = {};
  if (nmEnabled) {
    try {
      nmCartAttributes = (await Promise.race([
        window.__nm?.getCartAttributes?.({ timeout: NM_TIMEOUT_MS }),
        new Promise(resolve => setTimeout(resolve, NM_CUTOFF_MS)),
      ]))?.attributes || {};
    } catch (error) {
      console.warn('[createCartAndCheckout] __nm.getCartAttributes 异常，跳过归因标识:', error);
    }
  }

  // 物自体的键放在末位：它的两个键是 __nm_vid / __nm_ctx，与 Promi 的键不重名，两边都保留。
  // 开关关闭时逐字退回改动前那一行（连浅拷贝都不做），便于贵方对照
  const promiCartAttributes = nmEnabled
    ? { ...(window.Promi?.cartAttributes || {}), ...nmCartAttributes }
    : (window.Promi?.cartAttributes || {});

  // 处理满赠赠品
  const fullItems = items.flatMap(item => {
    const giftList = window.fullGiftList?.find(giftItem => giftItem.id == item.id)?.autoBuyChildResps || [];
    // ToB 用户不享受满赠；无赠品列表时直接返回空
    if (!giftList.length || window.isToBUser) return [];
    return giftList.map(giftItem => ({
      id: giftItem.id,
      quantity: (Number(giftItem.quantity) || 0) * (Number(item.quantity) || 1),
      parentId: item.id, // 父级商品(variant)id，建立 GraphQL 嵌套购物车行(父子级)关系
    }));
  });

  const lineItems = [...items, ...fullItems];

  // 构建 Attributes 的 GraphQL 输入格式（使用变量，不拼字符串）
  const buildAttributeInput = (attrs) => Object.entries(attrs).map(([key, value]) => ({ key, value }));

  // 构建 lines 输入（用于变量）
  const linesInput = lineItems.map(item => {
    const line = {
      quantity: Number(item.quantity),
      merchandiseId: `gid://shopify/ProductVariant/${item.id}`,
      attributes: buildAttributeInput({ ...promiCartAttributes, ...item.properties })
    };
    // 嵌套购物车行：赠品行通过 parent.merchandiseId 关联父级商品(variant)
    if (item.parentId) {
      line.parent = { merchandiseId: `gid://shopify/ProductVariant/${item.parentId}` };
    }
    return line;
  });

  // 携带 selling_plan 参数值
  const sellingPlan = document.querySelector('input[name="selling_plan"]') || '';
  if(sellingPlan && sellingPlan.value) {
    linesInput.forEach(item => item.sellingPlanId = `gid://shopify/SellingPlan/${sellingPlan.value}`);
  }

  // 兜底链接
  const finalProperties = { ...promiCartAttributes, ...(properties || {}) };
  const props = btoa(encodeURIComponent(JSON.stringify(finalProperties)));
  const cartStr = lineItems.reduce((acc, item) => acc + `${item.id}:${item.quantity},`, '/cart/');
  let checkoutUrl = `${cartStr.slice(0, -1)}?traffic_source=buy_now&properties=${props}`;

  // GraphQL Mutation 使用变量
  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      lines: linesInput,
      attributes: buildAttributeInput(promiCartAttributes)
    }
  };

  try {
    const response = await fetch('/api/2025-10/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      throw new Error('GraphQL request failed');
    }

    const cartCheckoutUrl = data.data?.cartCreate?.cart?.checkoutUrl;
    if (cartCheckoutUrl) {
      checkoutUrl = cartCheckoutUrl;
    }

    return checkoutUrl;
  } catch (error) {
    console.error('Error creating cart:', error);
    return checkoutUrl; // 失败时返回兜底链接
  }
}

function getAbsoluteTop(element) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return rect.top + scrollTop;
}

const getCSSNumber = (el, varName) => {
  const value = getComputedStyle(el).getPropertyValue(varName);
  return value ? parseFloat(value) : 0;
};

// 图片懒加载处理 - start
function loadingImage(image) {
  if (image.tagName.toLowerCase() === "img") {
    image.dataset.srcset &&
      (image.setAttribute("srcset", image.dataset.srcset),
      image.classList.add("image-lazy-loaded"),
      image.removeAttribute("data-srcset"));
  } else if (image.tagName.toLowerCase() === "picture") {
    const img = image.querySelector("img");
    img.dataset.src &&
      (img.setAttribute("src", img.dataset.src),
      img.removeAttribute("data-src"));

    const sources = image.querySelectorAll("source");
    sources.forEach((source) => {
      source.dataset.srcset &&
        (source.setAttribute("srcset", source.dataset.srcset),
        source.removeAttribute("data-srcset"));
    });

    image.classList.add("image-lazy-loaded");
  }
}

function initializeScrollLazyImageTrigger() {
  let observer;
  const observedImages = new WeakSet();

  function checkLazyImages() {
    const lazyImages = document.querySelectorAll(".image-lazy-loading:not(.image-lazy-loaded,jky-header .image-lazy-loading)");

    if ("IntersectionObserver" in window) {
      lazyImages.forEach((img) => {
        if (!observedImages.has(img)) {
          observedImages.add(img);
          observer.observe(img);
        }
      });
    } else {
      lazyImages.forEach((img) => loadingImage(img));
    }
  }

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadingImage(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: "0px 0px 400px 0px",
      threshold: 0
    });

    checkLazyImages();
  } else {
    checkLazyImages();
  }

  const scheduleCheckLazyImages = debounce(checkLazyImages, 80);
  window.addEventListener("resize", scheduleCheckLazyImages);
  document.addEventListener("transitionend", scheduleCheckLazyImages); // 兼容处理swiper loop动态插入情况
}
// 图片懒加载处理 - end

/* Gloal events - end */
// 通用数据埋码
const gaPushDataLayer = (eventName = 'users_click', params) => {
  const gaEvent = () => {
    window.dataLayer.push({ "event_parameters": null });
    window.dataLayer.push({
      event: 'ga4Event',
      event_name: eventName,
      event_parameters: {
        current_page: window.location.href,
        site_version: pageInfo?.site_version === 'v5' ? '5.0' : '4.0',
        page_group: location.pathname === '/' ? 'home' : location.pathname.match(/^\/[^\/]+/)?.[0] || '',
        ...params
      }
    });
  }
  window.dataLayer ? gaEvent() : setTimeout(() => gaEvent(), 3000)
}

/**
 * 全局函数 - 处理购物车更新
 * 新购物车【jky-cart】需要获取返回jky-cart dom
 * 旧版本购物车cart更新都走的内部renderContents里面的fix，额外多了一层请求链路
 */
function fixRefreshCartDom() {
  if (document.querySelector("jky-cart")) {
    return {sections: document.querySelector("jky-cart")?.sectionId ? document.querySelector("jky-cart")?.sectionId : 'jky-cart', sections_url: window.location.pathname}
  } else {
    return {};
  }
}

(function () {
  const viewportWidthQuery = window.matchMedia('(max-width: 1023px)');

  function getCookieDomain(host = location.host) {
    if (host.split('.').length === 1) return '';
    if (host.indexOf(".jackery.com") !== -1) return '.jackery.com';

    const domainParts = host.split('.');
    domainParts.shift();
    return '.' + domainParts.join('.');
  }

  function getElementRect($el) {
    if (!$el) return null;
    if (typeof $el.getBoundingClientRect === 'function') return $el.getBoundingClientRect();
    if ($el[0] && typeof $el[0].getBoundingClientRect === 'function') return $el[0].getBoundingClientRect();
    return null;
  }

  function getViewportSize() {
    return {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight,
    };
  }

  /**
   * 全局Cookie操作
   * 跨站点请使用这个方法操作cookie
   */
  const cookie = {
    set(name, value, exDays = 7) {
      let d = new Date();
      d.setTime(d.getTime() + (exDays * 24 * 60 * 60 * 1000));
      let expires = `expires=${d.toUTCString()}`;
      const cookieValue = `${name}=${value}; ${expires}; path=/`;
      const domain = getCookieDomain();

      if (!domain) {
        document.cookie = cookieValue;
      } else {
        document.cookie = `${cookieValue}; domain=${domain}`;
      }
    },
    get(n) {
      let name = n + "=";
      let ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name) === 0) {
          return c.substring(name.length, c.length)
        }
      }
      return ""
    },
    erase(name) {
      this.set(name, "", -1)
    }
  }

  /**
   * @function 有效时长计算
   * @param {number} val 输入值
   * @param {number} capacity 电池容量（Wh）
   * @param {number} efficiency 效率，默认：0.8
   * @param {number} acConsumption 损耗（W），默认：0
   *
   **/
  const getRunningTime = (val, capacity, efficiency = 0.8, acConsumption = 0) => {
    let result = 0;
    if (val && capacity) {
      result = ((capacity * efficiency) / (val + acConsumption)).toFixed(1);
    }
    return result;
  }

  /**
   * 检测元素是否进入视窗
   * @param $el - 元素节点
   * @param {number} threshold - 距离进入可视范围指定距离时候触发
   * @returns {boolean}
   */
  function isElementInViewport($el, threshold = 0) {
    const rect = getElementRect($el);
    if (!rect) return false;

    const viewport = getViewportSize();
    return (
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= (viewport.height + threshold) &&
      rect.left <= viewport.width
    );
  }

  /**
   * 检测元素是否移出视窗
   * @param $el 元素
   * @returns {boolean}
   */
  function isElementOutOfViewport($el) {
    const rect = getElementRect($el);
    if (!rect) return true;

    const viewport = getViewportSize();
    const isAboveViewport = rect.bottom < 0;
    const isBelowViewport = rect.top > viewport.height;
    const isLeftOfViewport = rect.right < 0;
    const isRightOfViewport = rect.left > viewport.width;
    return isAboveViewport || isBelowViewport || isLeftOfViewport || isRightOfViewport;
  }

  // 判断是否是移动端
  const isMobile = () => {
    // match 存在不兼容情况
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // 判断是否时小于1024屏幕
  const isLessThan1024Screen = () => viewportWidthQuery.matches;

  /**
   * 判断是否是 iOS 系统
   * @returns 是否是IOS系统
   * 在 iPhone（iOS Safari/Chrome 内核也是 WebKit） 上，window.open 只有在 用户的同步点击事件（click/touchstart）中触发 时才会生效。
   * 如果是：
   *    1、异步触发（比如在 setTimeout、Promise.then、ajax 回调 里执行） → iOS 会直接拦截，导致没反应。
   *    2、直接调用（非用户交互） → iOS Safari 也会拦截。
   */
  function isiOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /**
   * @function 拉起免密登录弹窗
   * @param {string} registerAct - 注册活动标签，默认：Account-Register
   */
  function showLoginPopup(registerAct = 'Account-Register') {
    if (window.jackeryLoginApp?.modalLogin) {
      window.jackeryLoginApp?.modalLogin?.({
        return_url: window.location.origin + window.location.pathname,
        register_act: registerAct,
      });
    }
  }

  /**
   * 获取 YouTube 视频 ID
   * @param {string} videoSrc - YouTube 视频的 URL
   * @returns {string} - 提取的视频 ID
   */
  function getYoutubeId(videoSrc) {
    // 检查视频源是否包含 "/embed/"
    if (videoSrc.indexOf("/embed/") !== -1) {
      // 移除嵌入式 URL 的前缀并返回视频 ID
      return videoSrc.replace("https://www.youtube.com/embed/", "").split('?')[0];
    } else if (videoSrc.includes("/shorts/")) {
      // 移除短视频 URL 的前缀并返回视频 ID
      return videoSrc.replace("https://www.youtube.com/shorts/", "").split('?')[0];
    } else if (videoSrc.includes("/youtu.be/")) {
      // 移除分享链接的前缀并返回视频 ID
      return videoSrc.replace("https://youtu.be/", "").split('?')[0];
    } else {
      // 移除标准视频链接的前缀并返回视频 ID
      return videoSrc.replace("https://www.youtube.com/watch?v=", "").split('?')[0];
    }
  }

  /**
   * 通用全局方法
   */
  window.Jackery = {};
  window.Jackery.Utils = {
    cookie,
    getRunningTime,
    isElementInViewport,
    isElementOutOfViewport,
    isMobile,
    isLessThan1024Screen,
    isiOS,
    showLoginPopup,
    getYoutubeId,
  };

  window.pageInfo = window.pageInfo ? window.pageInfo : {}

  // 暂时保留，防止shougun或其他历史js使用，待排查后 在一个大版本再剔除
  window.utils = window.utils ? window.utils : {}
  window.utils.cookie = cookie

})();

document.addEventListener('DOMContentLoaded', function() { // 初始化
  // 懒加载图片
  initializeScrollLazyImageTrigger();
});
