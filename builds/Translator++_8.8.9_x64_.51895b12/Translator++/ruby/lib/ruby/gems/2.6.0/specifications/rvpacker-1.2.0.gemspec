# -*- encoding: utf-8 -*-
# stub: rvpacker 1.2.0 ruby lib

Gem::Specification.new do |s|
  s.name = "rvpacker".freeze
  s.version = "1.2.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Howard Jeng".freeze, "Andrew Kesterson".freeze]
  s.date = "2014-06-03"
  s.email = ["andrew@aklabs.net".freeze]
  s.executables = ["rvpacker".freeze]
  s.files = ["bin/rvpacker".freeze]
  s.homepage = "https://github.com/akesterson/rvpacker".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "3.0.3".freeze
  s.summary = "Pack and unpack RPG Maker data files".freeze

  s.installed_by_version = "3.0.3" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 3

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.6"])
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
      s.add_runtime_dependency(%q<trollop>.freeze, [">= 0"])
      s.add_runtime_dependency(%q<psych>.freeze, ["= 2.0.0"])
      s.add_runtime_dependency(%q<formatador>.freeze, [">= 0"])
    else
      s.add_dependency(%q<bundler>.freeze, ["~> 1.6"])
      s.add_dependency(%q<rake>.freeze, [">= 0"])
      s.add_dependency(%q<trollop>.freeze, [">= 0"])
      s.add_dependency(%q<psych>.freeze, ["= 2.0.0"])
      s.add_dependency(%q<formatador>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, ["~> 1.6"])
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<trollop>.freeze, [">= 0"])
    s.add_dependency(%q<psych>.freeze, ["= 2.0.0"])
    s.add_dependency(%q<formatador>.freeze, [">= 0"])
  end
end
