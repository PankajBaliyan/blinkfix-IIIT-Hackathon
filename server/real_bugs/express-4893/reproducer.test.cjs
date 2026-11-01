'use strict'
const assert = require('node:assert/strict')
const { once } = require('node:events')
const net = require('node:net')
const test = require('node:test')
const express = require('../')

function rawRequest(server) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(server.address().port, '127.0.0.1')
    let response = ''
    socket.setEncoding('latin1')
    socket.on('connect', () => socket.end('GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'))
    socket.on('data', chunk => { response += chunk })
    socket.on('end', () => resolve(response))
    socket.on('error', reject)
  })
}

test('res.send does not combine Transfer-Encoding and Content-Length', async () => {
  const app = express()
  app.get('/', (_request, response) => {
    response.set('Transfer-Encoding', 'chunked').send('hello')
  })
  const server = app.listen(0, '127.0.0.1')
  try {
    await once(server, 'listening')
    const raw = await rawRequest(server)
    const headers = raw.slice(0, raw.indexOf('\r\n\r\n')).toLowerCase()
    assert.match(headers, /\r\ntransfer-encoding: chunked/)
    assert.doesNotMatch(headers, /\r\ncontent-length:/)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
})
