const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(customParseFormat)

module.exports = {
  lang: 'en',
  days: 3,
  site: 'dstv.com',
  channels: 'dstv.com.channels.xml',
  output: '.gh-pages/guides/dstv.com.guide.xml',
  request: {
    timeout: 10000
  },
  url({ channel, date }) {
    const [bouquetId] = channel.site_id.split('#')

    return `https://guide.dstv.com/api/gridview/page?&bouquetId=${bouquetId}&genre=all&date=${date.format(
      'YYYY-MM-DD'
    )}`
  },
  parser({ content, date, channel }) {
    let PM = false
    const programs = []
    const items = parseItems(content, date, channel)
    items.forEach(item => {
      const title = item.title
      let start = parseStart(item, date)
      if (start.hour() > 18 && !PM) return
      if (start.hour() > 11 && start.hour() < 18) PM = true
      if (start.hour() < 12 && PM) start = start.add(1, 'd')
      const stop = start.add(30, 'm')
      if (programs.length) {
        programs[programs.length - 1].stop = start
      }

      programs.push({
        title,
        start,
        stop
      })
    })

    return programs
  }
}

function parseStart(item, date) {
  time = `${date.format('MM/DD/YYYY')} ${item.time}`

  return dayjs.utc(time, 'MM/DD/YYYY HH:mm')
}

function parseItems(content, date, channel) {
  const [_, channelTag] = channel.site_id.split('#')
  const json = JSON.parse(content)
  const html = json[channelTag]
  if (!html) return []
  const $ = cheerio.load(html)

  return $('li')
    .map((i, el) => {
      return {
        time: $(el).find('.event-time').text().trim(),
        title: $(el).find('.event-title').text().trim()
      }
    })
    .toArray()
    .filter(i => i.time && i.title)
}
