import { useRef, useState, useEffect } from 'react'

// A small box that opens the camera and takes a square 200x200 photo.
// When the photo is taken, it calls onCapture(photoText).
function CameraCapture({ onCapture }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  // Turn the camera off if the user leaves this page
  useEffect(() => {
    return () => stopCamera()
  }, [])

  // Show the live picture inside the video box
  useEffect(() => {
    if (open && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [open])

  function openCamera() {
    setError('')
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Error: This browser cannot use the camera')
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        streamRef.current = stream
        setOpen(true)
      })
      .catch(() => {
        setError('Error: Could not open the camera. Please allow camera access.')
      })
  }

  function closeCamera() {
    stopCamera()
    setOpen(false)
  }

  function takePhoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setError('Error: Camera is not ready yet. Try again.')
      return
    }

    const size = 200
    const side = Math.min(video.videoWidth, video.videoHeight)
    const sx = (video.videoWidth - side) / 2
    const sy = (video.videoHeight - side) / 2

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size)

    onCapture(canvas.toDataURL('image/jpeg', 0.8))
    closeCamera()
  }

  return (
    <div className="camera-box">
      {!open && (
        <button type="button" className="grey" onClick={openCamera}>
          📷 Use camera
        </button>
      )}

      {open && (
        <div>
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            playsInline
            muted
          />
          <div>
            <button type="button" className="green" onClick={takePhoto}>
              Take photo
            </button>
            <button type="button" className="grey" onClick={closeCamera}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="msg-error">{error}</p>}
    </div>
  )
}

export default CameraCapture