import AVFoundation
import ExpoModulesCore
import MediaPlayer

// Feeds the iOS system "Now Playing" widget (the standard media card on the Lock
// Screen / Control Center / Dynamic Island) while expo-av does the actual audio.
// We set MPNowPlayingInfoCenter (title / artist / artwork / duration / elapsed /
// rate) and register MPRemoteCommandCenter handlers that forward the hardware &
// on-screen transport buttons back to JS via the `remoteCommand` event.
public class SolaceNowPlayingModule: Module {
  private var commandsWired = false

  public func definition() -> ModuleDefinition {
    Name("SolaceNowPlaying")

    Events("remoteCommand")

    OnCreate {
      self.wireRemoteCommands()
    }

    // Set the full now-playing card for a freshly-started session.
    Function("setInfo") {
      (title: String, artist: String, artworkUri: String?, duration: Double, elapsed: Double, isPlaying: Bool) in
      var info: [String: Any] = [:]
      info[MPMediaItemPropertyTitle] = title
      info[MPMediaItemPropertyArtist] = artist
      if duration > 0 { info[MPMediaItemPropertyPlaybackDuration] = duration }
      info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
      info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
      MPNowPlayingInfoCenter.default().nowPlayingInfo = info
      if let uri = artworkUri, !uri.isEmpty { self.loadArtwork(uri) }
    }

    // Cheap update on play/pause/seek — the system interpolates the scrubber
    // from elapsed + rate, so this doesn't need to fire every frame.
    Function("updatePlayback") { (isPlaying: Bool, elapsed: Double, duration: Double) in
      var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
      info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
      if duration > 0 { info[MPMediaItemPropertyPlaybackDuration] = duration }
      info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
      MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    Function("clear") {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }
  }

  private func wireRemoteCommands() {
    if commandsWired { return }
    commandsWired = true
    let center = MPRemoteCommandCenter.shared()

    center.playCommand.isEnabled = true
    center.pauseCommand.isEnabled = true
    center.togglePlayPauseCommand.isEnabled = true
    center.nextTrackCommand.isEnabled = true
    center.previousTrackCommand.isEnabled = true

    center.playCommand.addTarget { [weak self] _ in
      self?.sendEvent("remoteCommand", ["type": "play"]); return .success
    }
    center.pauseCommand.addTarget { [weak self] _ in
      self?.sendEvent("remoteCommand", ["type": "pause"]); return .success
    }
    center.togglePlayPauseCommand.addTarget { [weak self] _ in
      self?.sendEvent("remoteCommand", ["type": "toggle"]); return .success
    }
    center.nextTrackCommand.addTarget { [weak self] _ in
      self?.sendEvent("remoteCommand", ["type": "next"]); return .success
    }
    center.previousTrackCommand.addTarget { [weak self] _ in
      self?.sendEvent("remoteCommand", ["type": "previous"]); return .success
    }
  }

  private func loadArtwork(_ uri: String) {
    func apply(_ image: UIImage) {
      let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
      DispatchQueue.main.async {
        var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
        info[MPMediaItemPropertyArtwork] = artwork
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
      }
    }

    if uri.hasPrefix("http") {
      guard let url = URL(string: uri) else { return }
      URLSession.shared.dataTask(with: url) { data, _, _ in
        if let data = data, let image = UIImage(data: data) { apply(image) }
      }.resume()
    } else {
      let path = uri.replacingOccurrences(of: "file://", with: "")
      if let image = UIImage(contentsOfFile: path) { apply(image) }
    }
  }
}
