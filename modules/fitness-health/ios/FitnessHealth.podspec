Pod::Spec.new do |s|
  s.name = 'FitnessHealth'
  s.version = '1.0.0'
  s.summary = 'Read-only Apple Health integration for Nutrition + Fitness'
  s.description = s.summary
  s.license = 'MIT'
  s.author = 'Nutrition + Fitness'
  s.homepage = 'https://developer.apple.com/health-fitness/'
  s.platforms = { :ios => '14.0' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.0'
end
