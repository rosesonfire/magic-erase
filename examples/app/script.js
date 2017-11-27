var magicErase = require('./../../magicErase')

function getImageName () {
  return document.querySelector('#imgExamples').value.split('-')[0]
}

function hideCriticalElements () {
  document.querySelectorAll('.critical').forEach(function (criticalElement) {
    criticalElement.setAttribute('hidden', true)
  })
}

function unhideCriticalElements () {
  document.querySelectorAll('.critical').forEach(function (criticalElement) {
    criticalElement.removeAttribute('hidden')
  })
}

var history = []
var historyIndex = 0

function refresh (erasePoints) {
  var sensitivity, imageName, config

  document.querySelectorAll('fieldset').forEach(function (fieldset) {
    fieldset.removeAttribute('hidden')
  })

  sensitivity = document.querySelector('#sensitivity').value
  document.querySelector('#object').setAttribute('src', '#')

  if (!erasePoints) {
    imageName = getImageName()
    document.querySelector('#image').setAttribute('src', '/' + imageName)
    config = { image: imageName, erasePoints: [], sensitivity }
    history = []
    historyIndex = 0
    document.querySelector('#undo').setAttribute('disabled', true)
    document.querySelector('#redo').setAttribute('disabled', true)
  } else {
    history.splice(historyIndex)
    document.querySelector('#redo').setAttribute('disabled', true)
    config = { image: history[historyIndex - 1].data, erasePoints, sensitivity }
  }

  hideCriticalElements()

  magicErase(config)
  .then(function (response) {
    var base64Img, objectImg
    base64Img = response.base64Img
    objectImg = document.querySelector('#object')
    objectImg.setAttribute('src', 'data:image/jpeg;base64,' + base64Img)
    history = history.splice(0, historyIndex)
    history[historyIndex] = { base64Img: response.base64Img, data: response.data }
    historyIndex++
    if (historyIndex > 1) {
      document.querySelector('#undo').removeAttribute('disabled')
    }
    unhideCriticalElements()
  })
}

document.querySelector('#imgExamples').addEventListener('change', function (event) {
  var imgInfo = this.value
  var sensitivity

  sensitivity = imgInfo.split('-')[1]
  document.querySelector('#sensitivity').value = sensitivity
  document.querySelector('#sensitivitySetter').value = sensitivity
  refresh()
})

document.querySelector('#sensitivity').addEventListener('change', function (event) {
  document.querySelector('#sensitivitySetter').value = this.value
})

document.querySelector('#sensitivitySetter').addEventListener('change', function (event) {
  if (this.value <= 0) {
    this.value = 0.1
  } else if (this.value > 100) {
    this.value = 100
  }
  document.querySelector('#sensitivity').value = this.value
})

document.querySelector('#object').addEventListener('click', function (event) {
  var erasePoint

  if (event.offsetX && event.offsetY && this.width > 0 && this.height > 0) {
    erasePoint = [
      event.offsetX / this.width * 100,
      event.offsetY / this.height * 100
    ]
    refresh([erasePoint])
  }
})

document.querySelector('#undo').addEventListener('click', function () {
  historyIndex--
  var lastImg = history[historyIndex - 1]
  var objectImg = document.querySelector('#object')
  objectImg.setAttribute('src', 'data:image/jpeg;base64,' + lastImg.base64Img)
  if (historyIndex <= 1) {
    document.querySelector('#undo').setAttribute('disabled', true)
  }
  document.querySelector('#redo').removeAttribute('disabled')
})

document.querySelector('#redo').addEventListener('click', function () {
  historyIndex++
  var lastImg = history[historyIndex - 1]
  var objectImg = document.querySelector('#object')
  objectImg.setAttribute('src', 'data:image/jpeg;base64,' + lastImg.base64Img)
  if (historyIndex >= history.length) {
    document.querySelector('#redo').setAttribute('disabled', true)
  }
  document.querySelector('#undo').removeAttribute('disabled')
})
