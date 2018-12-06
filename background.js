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
  const blockRequestCallback = details => ({ cancel: true });

  if (clear) {
    if(chrome.webRequest.onBeforeRequest.hasListener(blockRequestCallback)) {
      chrome.webRequest.onBeforeRequest.removeListener(blockRequestCallback);
    };
  } else {
    chrome.webRequest.onBeforeRequest.addListener(blockRequestCallback, { urls }, ['blocking']);
  }
}

const ORIGIN_TIME_MAP = {
  facebook: {
    url: '*://*.facebook.com/*',
    time: 10000
  },
  youtube: {
    url: '*://*.youtube.com/*',
    time: 20000
  }
};

const PERIOD = 1000;

// TODO: Finish this! Would be super awesome!!!

const createInterval = (tabUrl) => {
  const interval = setInterval(() => {
    const currentDate = new Date().getTime();
    const { origin } = document.location;
    const originDateCookie = `${origin}/dateCookie`;
    const spentTimeCookie = `${origin}/spentTime`;

    const lastDateCookie = readCookie(originDateCookie);
    console.log('lastDateCookie', lastDateCookie);

    // initial
    if (!lastDateCookie) {
      console.log('bake initial');
      bakeCookie(spentTimeCookie, String(0));
    } else {
      const lastDate = new Date(lastDateCookie);
      console.log('lastDate', lastDate);

      if (lastDate.getUTCDay() != new Date().getUTCDay()) {
        // new day, no blocking!
        updateFilters([], true);
      } else {
        // TODO: progamatically get the domain name...
        let key = 'facebook';

        if (tabUrl.includes('youtube')) {
          key = 'youtube';
        };

        const lastSpentTime = Number(readCookie(spentTimeCookie));
        const newSpentTime = lastSpentTime + PERIOD;

        if (newSpentTime > ORIGIN_TIME_MAP[key].time) {
          console.log('!!!block: ', ORIGIN_TIME_MAP[key].url);
          updateFilters([ORIGIN_TIME_MAP[key].url]);
        }
        console.log('lastSpentTime', lastSpentTime);

        bakeCookie(spentTimeCookie, String(newSpentTime));
      }
    }

    bakeCookie(originDateCookie, currentDate);
  }, PERIOD);

  return interval;
}

const tabIdIntervalMap = {};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('tabId', tabId, 'tab.url', tab.url);
  if (tab.url.includes("facebook") || tab.url.includes("youtube")) {
    if (!tabIdIntervalMap[tabId]) {
      tabIdIntervalMap[tabId] = createInterval(tab.url);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('remove tabId', tabId);
  delete tabIdIntervalMap[tabId];
});

updateFilters([], true);