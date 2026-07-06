Pod::Spec.new do |s|
  s.name           = 'SolaceNowPlaying'
  s.version        = '1.0.0'
  s.summary        = 'Feeds the iOS system Now Playing widget for the Solace player.'
  s.description    = 'Sets MPNowPlayingInfoCenter + MPRemoteCommandCenter so the standard media card (Lock Screen / Control Center / Dynamic Island) shows the current meditation.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '14.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
