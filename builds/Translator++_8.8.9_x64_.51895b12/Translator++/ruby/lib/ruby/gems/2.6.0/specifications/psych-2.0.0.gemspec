# -*- encoding: utf-8 -*-
# stub: psych 2.0.0 ruby lib
# stub: ext/psych/extconf.rb

Gem::Specification.new do |s|
  s.name = "psych".freeze
  s.version = "2.0.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Aaron Patterson".freeze]
  s.date = "2013-06-27"
  s.description = "Psych is a YAML parser and emitter.  Psych leverages libyaml[http://pyyaml.org/wiki/LibYAML]\nfor its YAML parsing and emitting capabilities.  In addition to wrapping\nlibyaml, Psych also knows how to serialize and de-serialize most Ruby objects\nto and from the YAML format.".freeze
  s.email = ["aaron@tenderlovemaking.com".freeze]
  s.extensions = ["ext/psych/extconf.rb".freeze]
  s.extra_rdoc_files = ["CHANGELOG.rdoc".freeze, "Manifest.txt".freeze, "README.rdoc".freeze]
  s.files = ["CHANGELOG.rdoc".freeze, "Manifest.txt".freeze, "README.rdoc".freeze, "ext/psych/extconf.rb".freeze]
  s.homepage = "http://github.com/tenderlove/psych".freeze
  s.rdoc_options = ["--main".freeze, "README.rdoc".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 1.9.2".freeze)
  s.rubygems_version = "3.0.3".freeze
  s.summary = "Psych is a YAML parser and emitter".freeze

  s.installed_by_version = "3.0.3" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rdoc>.freeze, ["~> 4.0"])
      s.add_development_dependency(%q<rake-compiler>.freeze, [">= 0.4.1"])
      s.add_development_dependency(%q<hoe>.freeze, ["~> 3.6"])
    else
      s.add_dependency(%q<rdoc>.freeze, ["~> 4.0"])
      s.add_dependency(%q<rake-compiler>.freeze, [">= 0.4.1"])
      s.add_dependency(%q<hoe>.freeze, ["~> 3.6"])
    end
  else
    s.add_dependency(%q<rdoc>.freeze, ["~> 4.0"])
    s.add_dependency(%q<rake-compiler>.freeze, [">= 0.4.1"])
    s.add_dependency(%q<hoe>.freeze, ["~> 3.6"])
  end
end
