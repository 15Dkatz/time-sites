const bakeCookie = (name, value, date) => {
  let expirey = date instanceof Date ? '; expires='+date : null
  var cookie = [name, '=', JSON.stringify(value), '; domain_.', window.location.host.toString(), '; path=/;',expirey].join('');
  document.cookie = cookie;
}

// reads a cookie according to the given name
const readCookie = name => {
  let result = document.cookie.match(new RegExp(name + '=([^;]+)'));
  result = result != null ? JSON.parse(result[1]) : [];
  return result;
}

const deleteCookie = name => {
  document.cookie = [name, '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; path=/; domain.', window.location.host.toString()].join('');
}

const updateFilters = (urls, clear = false) => {
  const blockRequestCallback = () => ({ cancel: true });

  if (clear) {
    if(chrome.webRequest.onBeforeRequest.hasListener(blockRequestCallback)) {
      chrome.webRequest.onBeforeRequest.removeListener(blockRequestCallback);
    };
  } else {
    chrome.webRequest.onBeforeRequest.addListener(blockRequestCallback, { urls }, ['blocking']);
  }
}

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

const SITE_TIME_MAP = {
  facebook: {
    url: '*://*.facebook.com/*',
    time: 2.5 * MINUTES
  },
  youtube: {
    url: '*://*.youtube.com/*',
    time: 10 * MINUTES
  }
};

const PERIOD = 1000;

const STATE_COOKIE = 'STATE_COOKIE_FOO1234';

bakeCookie(STATE_COOKIE, JSON.stringify({ currentDay: new Date().getDay() }));
let GIANT_STATE = JSON.parse(readCookie(STATE_COOKIE));

console.log('GIANT_STATE', GIANT_STATE);

const setState = newStateProperties => {
  const cookieState = readCookie(STATE_COOKIE);

  const currentState = cookieState ? JSON.parse(cookieState) : {};

  const newState = Object.keys(newStateProperties).length == 0
    ? {}
    : Object.assign(currentState, newStateProperties);

  console.log('newState', newState);
  bakeCookie(STATE_COOKIE, JSON.stringify(newState));
}

const readState = () => {
  return JSON.parse(readCookie(STATE_COOKIE));
}

let lastInterval;

const tabMap = {};

const trackTime = tab => {
  console.log('tab', tab);
  clearInterval(lastInterval);

  const tabUrl = tab.url;
  console.log('tabUrl', tabUrl);

  Object.keys(SITE_TIME_MAP).forEach(siteKey => {
    if (tabUrl.includes(siteKey)) {
      let state = readState();

      const currentDay = new Date().getDay()

      if (state.currentDay != currentDay) {
        // New day: inblock the sites
        updateFilters([], true);
        setState({ currentDay });
      }

      console.log('state', state);

      if (!state[tabUrl]) {
        setState({ [tabUrl]: { activeTime: 0 } });
      } else {
        let { activeTime } = state[tabUrl];

        lastInterval = setInterval(() => {
          activeTime += PERIOD;

          console.log('activeTime', activeTime);

          if (activeTime > SITE_TIME_MAP[siteKey].time) {
            console.log('BLOCK!!!', tabUrl);
            alert('Close this tab!');
            updateFilters([SITE_TIME_MAP[siteKey].url]);
          }

          setState({ [tabUrl]: { activeTime }});
        }, PERIOD)
      }
    }
  });
};

// Called when the user clicks on the browser action.
chrome.tabs.onSelectionChanged.addListener((tabId, selectionInfo) => {
  console.log('tabId', tabId);
  chrome.tabs.get(tabId, tab => {
    trackTime(tab);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  tabMap[tabId] = tab;
  trackTime(tab);
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  clearInterval(lastInterval);
});

// Uncomment to unblock the sites
// updateFilters([], true);