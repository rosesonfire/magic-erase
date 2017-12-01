const _getPixels = require('get-pixels')
const _ndarray = require('ndarray')
const _toString = require('stream-to-string')
const _savePixels = require('save-pixels')
const _base64 = require('base64-stream')

// ==== Functions with immediate side effects ====

const validateStartingPoint = ([lenI, lenJ]) => (start) => {
  if (start[0] < 0 || start[0] >= lenI || start[1] < 0 || start[1] >= lenJ) {
    throw new Error('Erase point is outside the image. Coordinates must be ' +
      'between 0 and 100.')
  }
  return start
}
const validateSensitivity = (sensitivity) => {
  if (sensitivity < 0.1 || sensitivity > 100) {
    throw new Error('Sensitivity must be between 0.1 and 100.')
  }
  return sensitivity
}
const addToQueue = ([lenI, lenJ], condition) => (queue, states) => (source) =>
  (a, b) => {
    if (a > -1 && a < lenI && b > -1 && b < lenJ && !states[a][b] &&
      condition(source, [a, b])) {
      queue.push([a, b])
      states[a][b] = 1
    }
  }

// =====Functions without immediate side affects ======

const initialize = (image, getPixels) => new Promise((resolve, reject) => {
  try {
    if (typeof image === 'string') {
      getPixels(image, (err, rgbPixels) => {
        if (err) {
          reject(err)
        } else {
          resolve(rgbPixels)
        }
      })
    } else {
      resolve(image)
    }
  } catch (e) {
    reject(e)
  }
})
const saveImage = (rgbPixels, toString, savePixels, base64) =>
  toString(savePixels(rgbPixels, 'jpg').pipe(base64.encode())).then(base64Img =>
    ({ data: rgbPixels, base64Img }))
const clonePixels = (rgbPixels, ndarray) =>
  ndarray([...rgbPixels.data], [...rgbPixels.shape], [...rgbPixels.stride],
    rgbPixels.offset)
const createStates = ([lenI, lenJ]) => () => {
  const states = []
  var i
  for (i = 0; i < lenI; i++) {
    states.push(new Array(lenJ))
  }
  return states
}
const addNeighborsToQueue = ([i, j], addToQueuePart) => {
  addToQueuePart(i - 1, j - 1)
  addToQueuePart(i - 1, j)
  addToQueuePart(i - 1, j + 1)
  addToQueuePart(i, j - 1)
  addToQueuePart(i, j + 1)
  addToQueuePart(i + 1, j - 1)
  addToQueuePart(i + 1, j)
  addToQueuePart(i + 1, j + 1)
}
const traversePoint = (f, addToQueuePart) => (res, point) => {
  addNeighborsToQueue(point, addToQueuePart(point))
  return f(res, point)
}
const traverse = (addToQueuePart1, validateStartingPointPart, crtStatesPart) =>
  (start) => (seed) => (f) => {
    const queue = [validateStartingPointPart(start)]
    const addToQueuePart2 = addToQueuePart1(queue, crtStatesPart())
    const traversePointPart = traversePoint(f, addToQueuePart2)
    var res = seed
    while (queue.length > 0) {
      res = traversePointPart(res, queue.splice(0, 1)[0])
    }
    return res
  }
const createRGBPixels = (setRGBPart) => (erasedPoints) =>
  foldLeft(erasedPoints)()((_, erasedPoint) => setRGBPart(erasedPoint))
const getRGB = (rgbPixels) => ([i, j]) => ({
  r: rgbPixels.get(i, j, 0),
  g: rgbPixels.get(i, j, 1),
  b: rgbPixels.get(i, j, 2)
})
const setRGB = (rgbPixels, color) => ([i, j]) => {
  rgbPixels.set(i, j, 0, color.r)
  rgbPixels.set(i, j, 1, color.g)
  rgbPixels.set(i, j, 2, color.b)
  rgbPixels.set(i, j, 3, 255)

  return rgbPixels
}
const getErasePoints = (erasePoints, [lenI, lenJ]) => erasePoints.map(point =>
  [
    Math.floor(point[0] * lenI / 100),
    Math.floor(point[1] * lenJ / 100)
  ])
const foldLeft = (items) => (seed) => (f) =>
  [seed, ...items].reduce((res, item) => f(res, item))
const getDiffR = (pixel1, pixel2) => pixel1.r - pixel2.r
const getDiffG = (pixel1, pixel2) => pixel1.g - pixel2.g
const getDiffB = (pixel1, pixel2) => pixel1.b - pixel2.b
const getDiffRes = (diffR, diffG, diffB) =>
  Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB)
const getDiff = (pixel1, pixel2) => getDiffRes(
  getDiffR(pixel1, pixel2), getDiffG(pixel1, pixel2), getDiffB(pixel1, pixel2))
const getMinDiff = (sensitivity) => (100 - sensitivity) * 20 / 100
const withinSensitivity = (getRGBPartial, minDiff) => (p1, p2) =>
  getDiff(getRGBPartial(p1), getRGBPartial(p2)) <= minDiff
const eraseFromPoint = (erasePoints, createRGBPixelsPart, trvrsPart) =>
  createRGBPixelsPart(trvrsPart(erasePoints)([erasePoints])((res, point) => {
    res.push(point)
    return res
  }))
const erase = (rgbPixels, erasePoints, minDiff, backColor, ndarray) =>
  foldLeft(erasePoints)(rgbPixels)((newRGBPixels, erasePoint) =>
    eraseFromPoint(erasePoint,
      createRGBPixels(setRGB(clonePixels(newRGBPixels, ndarray), backColor)),
      traverse(
        addToQueue(newRGBPixels.shape,
          withinSensitivity(getRGB(newRGBPixels), minDiff)),
        validateStartingPoint(newRGBPixels.shape),
        createStates(newRGBPixels.shape))))

// === API ===

const magicErase = ({ image, erasePoints, sensitivity }) =>
  initialize(image, _getPixels)
  .then((rgbPixels) =>
    erase(rgbPixels, getErasePoints(erasePoints, rgbPixels.shape),
      getMinDiff(validateSensitivity(sensitivity)),
      { r: 255, g: 255, b: 255 }, _ndarray))
  .then((rgbPixels) => saveImage(rgbPixels, _toString, _savePixels, _base64))

module.exports = magicErase
