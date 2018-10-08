import util from 'util'
import { isPlainObject } from '../utils'

export default class BasicReporter {
  constructor (options) {
    this.options = Object.assign({
      stream: process.stdout
    }, options)
  }

  clear () {
    this.options.stream.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H')
  }

  write (data) {
    this.options.stream.write(data)
  }

  parseStack (stack) {
    let lines = stack
      .split('\n')
      .map(l => l
        .trim()
        .replace(/^at /, '')
      )

    if (lines[0].indexOf('Error: ') === 0) {
      lines = lines.splice(1)
    }

    return lines
  }

  formatStack (stack) {
    return '> ' + this.parseStack(stack).join('\n> ')
  }

  format (arg) {
    if (isPlainObject(arg)) {
      return JSON.stringify(arg, null, 2)
    }

    if (util.formatWithOptions) {
      // Node >= 10
      return util.formatWithOptions({ colors: true }, arg)
    } else {
      return util.format(arg)
    }
  }

  getFields (logObj) {
    let message = logObj.message || ''
    let type = logObj.type || ''
    let tag = logObj.tag || ''
    let date = logObj.date.toLocaleTimeString()

    // Format args
    const args = logObj.args.map(arg => {
      // error-like argument
      if (arg.stack) {
        if (!message.length && arg.message) {
          message = arg.message
        }
        if (!type.length) {
          type = 'error'
        }
        return this.formatStack(arg.stack, { suffix: ' ↲' })
      }

      // General argument
      return this.format(arg)
    })

    // If no message is provided, assume args[0] as message
    if (!message.length && args.length) {
      message = args.shift()
    }

    return {
      args,
      date,
      message,
      tag,
      type
    }
  }

  log (logObj) {
    const fields = this.getFields(logObj)

    // Print date
    if (fields.type.length) {
      this.write((`[${fields.date}] `))
    }

    // Print type
    if (fields.type.length) {
      this.write((`[${fields.type.toUpperCase()}] `))
    }

    // Print tag
    if (fields.tag.length) {
      this.write(`[${fields.tag}] `)
    }

    // Print message
    if (fields.message.length) {
      this.write(fields.message)
    }

    // Print additional args
    if (fields.args.length) {
      this.write('\n' + (fields.args.join(' ')))
    }

    // Newline
    this.write('\n')
  }
}
