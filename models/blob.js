module.exports = SKBlob

var BufferUtils = require('../lib/buffer-utils')
var Story = require('./story')
var fileType = require('file-type')
var JSZip = require('jszip')

/**
 * Snapchat Blob wrapper
 *
 * @class
 * @param {Buffer} data
 */
function SKBlob (data) {
  var self = this
  if (!(self instanceof SKBlob)) return new SKBlob(data)

  if (!(data instanceof Buffer)) {
    data = new Buffer(data)
  }

  self._data = data
  self._type = fileType(data)

  self._isImage = BufferUtils.isImage(data)
  self._isMPEG4 = BufferUtils.isMPEG4(data)
  self._isVideo = self._isMPEG4
  self._isMedia = BufferUtils.isMedia(data)

  // TODO
  self._overlay = null
}

/**
 * The underlying data for the image or video.
 *
 * @name SKBlob#data
 * @property {Buffer}
 * @readonly
 */
Object.defineProperty(SKBlob.prototype, 'data', {
  get: function () { return this._data }
})

/**
 * Information about the media type.
 *
 * @name SKBlob#type
 * @property {Buffer}
 * @readonly
 */
Object.defineProperty(SKBlob.prototype, 'type', {
  get: function () { return this._type }
})

/**
 * The overlay for the video if applicable.
 *
 * @name SKBlob#overlay
 * @property {Buffer}
 * @readonly
 */
Object.defineProperty(SKBlob.prototype, 'overlay', {
  get: function () { return this._overlay }
})

/**
 * Whether or not this blob represents an image (PNG or JPEG).
 *
 * @name SKBlob#isImage
 * @property {boolean}
 * @readonly
 */
Object.defineProperty(SKBlob.prototype, 'isImage', {
  get: function () { return this._isImage }
})

/**
 * Whether or not this blob represents a video (MPEG4).
 *
 * @name SKBlob#isVideo
 * @property {boolean}
 * @readonly
 */
Object.defineProperty(SKBlob.prototype, 'isVideo', {
  get: function () { return this._isVideo }
})

/**
 * Whether or not this blob represents an MPEG4 video.
 *
 * @name SKBlob#isMPEG4
 * @property {boolean}
 * @readonly
 */
Object.defineProperty(SKBlob.prototype, 'isMPEG4', {
  get: function () { return this._isMPEG4 }
})

/**
 * Whether or not this blob represents a supported image or video format.
 *
 * @name SKBlob#isMedia
 * @property {boolean}
 * @readonly
 */
Object.defineProperty(SKBlob.prototype, 'isMedia', {
  get: function () { return this._isMedia }
})

/**
 * Initializes and returns a new SKBlob from the given raw data.
 * Does not handle encrypted data.
 *
 * @static
 * @param {Buffer} data
 * @param {function} cb
 */
SKBlob.initWithData = function (data, cb) {
  if (!data) {
    return cb('error empty blob')
  }

  if (typeof data === 'string') {
    data = new Buffer(data)
  }

  if (BufferUtils.isCompressed(data)) {
    var files = SKBlob.decompress(data)
    return cb(null, files)
  }

  var blob = new SKBlob(data)
  return cb(blob.isMedia ? null : 'unknown blob format', blob)
}

/**
 * Initializes and returns a new SKBlob from the given story and raw data.
 *
 * @static
 * @param {Buffer} data
 * @param {Story} story
 * @param {function} cb
 */
SKBlob.initWithStoryData = function (data, story, cb) {
  if (!(story instanceof Story)) {
    throw new Error('SKBlob.initWithStoryData invalid story')
  }

  if (typeof data === 'string') {
    data = new Buffer(data)
  }

  if (BufferUtils.isCompressed(data)) {
    var files = SKBlob.decompress(data)
    return cb(null, files)
  }

  return SKBlob.decrypt(data, story, cb)
}

/**
 * Unarchives blobs initialized with anonymous data.
 *
 * @static
 * @param {Buffer} data
 * @param {function} cb
 */
SKBlob.decompress = function (data, cb) {
  var zip = new JSZip(data)
  var files = Object.keys(zip.files).map(function (filename) {
    var decompressed = zip.file(filename).asNodeBuffer()
    return {
      name: filename,
      blob: new SKBlob(decompressed)
    }
  })
  return files
}

/**
 * @static
 * @param {Buffer} data
 * @param {Story} story
 * @param {function} cb
 */
SKBlob.decrypt = function (data, story, cb) {
  if (!(story instanceof Story)) {
    throw new Error('SKBlob.decrypt invalid story')
  }

  if (!BufferUtils.isCompressed(data) && !BufferUtils.isMedia(data) && story) {
    data = BufferUtils.decryptStory(data, story.mediaKey, story.mediaIV)
  }

  if (BufferUtils.isCompressed(data)) {
    var files = SKBlob.decompress(data)
    return cb(null, files)
  }

  var blob = new SKBlob(data)
  return cb(blob.isMedia ? null : 'unknown blob format', blob)
}
