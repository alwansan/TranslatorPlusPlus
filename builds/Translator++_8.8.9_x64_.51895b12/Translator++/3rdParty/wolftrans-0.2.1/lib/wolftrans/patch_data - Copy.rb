require 'wolftrans/context'
require 'wolfrpg'

require 'fileutils'
require 'find'
require 'set'

#####################
# Loading Game data #
module WolfTrans
  class Patch
    def load_data(game_dir)
      @game_dir = Util.sanitize_path(game_dir)
      unless Dir.exist? @game_dir
        raise "could not find game folder '#{@game_dir}'"
      end
      @game_data_dir = Util.join_path_nocase(@game_dir, 'data')
      if @game_data_dir == nil
        raise "could not find Data folder in '#{@game_dir}'"
      end

      # Load databases, Game.dat, and common events
      @databases = {}
      basicdata_dir = Util.join_path_nocase(@game_data_dir, 'basicdata')
      if basicdata_dir == nil
        raise "could not find BasicData folder in '#{@game_data_dir}'"
      end
      Dir.entries(basicdata_dir).each do |entry|
        entry_downcase = entry.downcase
        filename = "#{basicdata_dir}/#{entry}"
        if entry_downcase == 'game.dat'
          @game_dat_filename = 'Data/BasicData/Game.dat'
          load_game_dat(filename)
        elsif entry_downcase.end_with?('.project')
          next if entry_downcase == 'sysdatabasebasic.project'
          basename = File.basename(entry_downcase, '.*')
          dat_filename = Util.join_path_nocase(basicdata_dir, "#{basename}.dat")
          next if dat_filename == nil
          load_game_database(filename, dat_filename)
        elsif entry_downcase == 'commonevent.dat'
          load_common_events(filename)
        end
      end

      # Game.dat is in a different place on older versions
      unless @game_dat
        Dir.entries(@game_dir).each do |entry|
          if entry.downcase == 'game.dat'
            @game_dat_filename = 'Game.dat'
            load_game_dat("#{@game_dir}/#{entry}")
            break
          end
        end
      end

      # Gather list of asset and map filenames
      map_names = Set.new
      @assets = {}
      @databases.each_value do |db|
        db.each_filename do |fn|
          fn_downcase = fn.downcase
          @assets[fn_downcase] = fn
          if fn_downcase.end_with?('.mps')
            map_names.add(File.basename(fn_downcase, '.*'))
          end
        end
      end
      @game_dat.each_filename do |fn|
        @assets[fn.downcase] = fn
      end
      @common_events.each_filename do |fn|
        @assets[fn.downcase] = fn
      end

      # Load maps
      maps_path = Util.join_path_nocase(@game_data_dir, 'mapdata')
      if maps_path == nil
        raise "could not find MapData folder in '#{@game_data_dir}'"
      end
      @maps = {}
      map_names.each do |name|
        map_path = Util.join_path_nocase(maps_path, name + '.mps')
        if map_path == nil
          STDERR.puts "warn: could not find map '#{name}'"
          next
        end
        load_map(map_path)
      end

      # Gather remaining asset filenames
      @maps.each_value do |map|
        map.each_filename do |fn|
          @assets[fn.downcase] = fn
        end
      end

      # Make sure not to treat certain kinds of filenames as assets
      @assets.reject! { |k, v| k.start_with?('save/') }

      # Rewrite asset filenames
      extcounts = Hash.new(0)
      @assets.keys.sort.each do |fn|
        ext = File.extname(fn)[1..-1]
        @assets[fn] = '%04d.%s' % [extcounts[ext], ext]
        extcounts[ext] += 1
      end
    end

    # Apply the patch to the files in the game path and write them to the
    # output directory
    def apply(out_dir)
      out_dir = Util.sanitize_path(out_dir)
      out_data_dir = "#{out_dir}/Data"

      # Clear out directory
      FileUtils.rm_rf(out_dir)
      FileUtils.mkdir_p("#{out_data_dir}/BasicData")

      #TODO create directories for each asset

      # Patch the databases
      @databases.each do |db_name, db|
        db.types.each_with_index do |type, type_index|
          next if type.name.empty?
          type.data.each_with_index do |datum, datum_index|
            datum.each_translatable do |str, field|
              context = Context::Database.from_data(db_name, type_index, type, datum_index, datum, field)
              yield_translation(str, context) do |newstr|
                datum[field] = newstr
              end
            end
          end
        end
        name_noext = "#{out_data_dir}/BasicData/#{db_name}"
        db.dump("#{name_noext}.project", "#{name_noext}.dat")
      end

      # Patch the common events
      @common_events.events.each do |event|
        event.commands.each_with_index do |command, cmd_index|
          context = Context::CommonEvent.from_data(event, cmd_index, command)
          patch_command(command, context)
        end
      end
      @common_events.dump("#{out_data_dir}/BasicData/CommonEvent.dat")

      # Patch Game.dat
      patch_game_dat
      @game_dat.dump("#{out_dir}/#{@game_dat_filename}")

      # Patch all the maps
      @maps.each do |map_name, map|
        map.events.each do |event|
          next unless event
          event.pages.each do |page|
            page.commands.each_with_index do |command, cmd_index|
              context = Context::MapEvent.from_data(map_name, event, page, cmd_index, command)
              patch_command(command, context)
            end
          end
        end
        # Translate path
        assetpath = @assets["mapdata/#{map_name.downcase}.mps"]
        fullpath = "#{out_data_dir}/#{assetpath}"
        map.dump(fullpath)
      end

      # Copy remaining BasicData files
      copy_data_files(Util.join_path_nocase(@game_data_dir, 'basicdata'),
                      ['xxxxx', 'dat', 'project', 'png'],
                      "#{out_data_dir}/BasicData")

      # Copy remaining assets
      @assets.each_pair do |fn, newfn|
        filename = get_asset_filename(fn)
        next unless filename
        FileUtils.cp(filename, "#{out_data_dir}/#{newfn}")
      end

      # Copy fonts
      if @patch_data_dir
        copy_data_files(@patch_data_dir, ['ttf','ttc','otf'], out_data_dir)
      end
      copy_data_files(@game_data_dir, ['ttf','ttc','otf'], out_data_dir)

      # Copy remainder of files in the base patch/game dirs
      copy_files(@patch_assets_dir, out_dir)
      copy_files(@game_dir, out_dir)
    end

    private
    def load_map(filename)
      map_name = File.basename(filename, '.*')
      patch_filename = "dump/mps/#{map_name}.txt"

      map = WolfRpg::Map.new(filename)
      map.events.each do |event|
        next unless event
        event.pages.each do |page|
          page.commands.each_with_index do |command, cmd_index|
            strings_of_command(command) do |string|
              @strings[string][Context::MapEvent.from_data(map_name, event, page, cmd_index, command)] ||=
                Translation.new(patch_filename)
            end
          end
        end
      end
      @maps[map_name] = map
    end

    def load_game_dat(filename)
      patch_filename = 'dump/GameDat.txt'
      @game_dat = WolfRpg::GameDat.new(filename)
      unless @game_dat.title.empty?
        @strings[@game_dat.title][Context::GameDat.from_data('Title')] = Translation.new(patch_filename)
      end
      unless @game_dat.version.empty?
        @strings[@game_dat.version][Context::GameDat.from_data('Version')] = Translation.new(patch_filename)
      end
      unless @game_dat.font.empty?
        @strings[@game_dat.font][Context::GameDat.from_data('Font')] = Translation.new(patch_filename)
      end
      @game_dat.subfonts.each_with_index do |sf, i|
        unless sf.empty?
          name = 'SubFont' + (i + 1).to_s
          @strings[sf][Context::GameDat.from_data(name)] ||=
            Translation.new(patch_filename)
        end
      end
    end

    def load_game_database(project_filename, dat_filename)
      db_name = File.basename(project_filename, '.*')
      db = WolfRpg::Database.new(project_filename, dat_filename)
      db.types.each_with_index do |type, type_index|
        next if type.name.empty?
        patch_filename = "dump/db/#{db_name}/#{Util.escape_path(type.name)}.txt"
        type.data.each_with_index do |datum, datum_index|
          datum.each_translatable do |str, field|
            context = Context::Database.from_data(db_name, type_index, type, datum_index, datum, field)
            @strings[str][context] ||= Translation.new(patch_filename)
          end
        end
      end
      @databases[db_name] = db
    end

    def load_common_events(filename)
      @common_events = WolfRpg::CommonEvents.new(filename)
      @common_events.events.each do |event|
        patch_filename = "dump/common/#{'%03d' % event.id}_#{Util.escape_path(event.name)}.txt"
        event.commands.each_with_index do |command, cmd_index|
          strings_of_command(command) do |string|
            @strings[string][Context::CommonEvent.from_data(event, cmd_index, command)] ||=
              Translation.new(patch_filename)
          end
        end
      end
    end

    def strings_of_command(command)
      case command
      when WolfRpg::Command::Message
        yield command.text if Util.translatable? command.text
      when WolfRpg::Command::Choices
        command.text.each do |s|
          yield s if Util.translatable? s
        end
      when WolfRpg::Command::StringCondition
        command.string_args.each do |s|
          yield s if Util.translatable? s
        end
      when WolfRpg::Command::SetString
        yield command.text if Util.translatable? command.text
      when WolfRpg::Command::Picture
        if command.type == :text
          yield command.text if Util.translatable? command.text
        end
      end
    end

    def patch_command(command, context)
      case command
      when WolfRpg::Command::Message
        yield_translation(command.text, context) do |str|
          command.text = str
        end
      when WolfRpg::Command::Choices
        command.text.each_with_index do |text, i|
          yield_translation(text, context) do |str|
            command.text[i] = str
          end
        end
      when WolfRpg::Command::StringCondition
        command.string_args.each_with_index do |arg, i|
          next if arg.empty?
          yield_translation(arg, context) do |str|
            command.string_args[i] = str
          end
        end
      when WolfRpg::Command::SetString
        yield_translation(command.text, context) do |str|
          command.text = str
        end
      when WolfRpg::Command::Picture
        if command.type == :text
          yield_translation(command.text, context) do |str|
            command.text = str
          end
        end
      end
    end

    def patch_game_dat
      yield_translation(@game_dat.title, Context::GameDat.from_data('Title')) do |str|
        @game_dat.title = str
      end
      yield_translation(@game_dat.version, Context::GameDat.from_data('Version')) do |str|
        @game_dat.version = str
      end
      yield_translation(@game_dat.font, Context::GameDat.from_data('Font')) do |str|
        @game_dat.font = str
      end
      @game_dat.subfonts.each_with_index do |sf, i|
        name = 'SubFont' + (i + 1).to_s
        yield_translation(sf, Context::GameDat.from_data(name)) do |str|
          @game_dat.subfonts[i] = str
        end
      end
    end

    # Yield a translation for the given string and context if it exists
    def yield_translation(string, context)
      return unless Util.translatable? string
      if @strings.include? string
        str = @strings[string][context].string
        yield str if Util.translatable? str
      end
    end

    # Copy normal, non-data files
    def copy_files(src_dir, out_dir)
      Find.find(src_dir) do |path|
        basename = File.basename(path)
        basename_downcase = basename.downcase

        # Don't do anything in Data/
        Find.prune if basename_downcase == 'data' && File.dirname(path) == src_dir

        # Skip directories
        next if FileTest.directory? path

        # "Short name", relative to the game base dir
        short_path = path[src_dir.length+1..-1]
        Find.prune if @file_blacklist.include? short_path.downcase

        out_path = "#{out_dir}/#{short_path}"
        next if ['thumbs.db', 'desktop.ini', '.ds_store'].include? basename_downcase
        next if File.exist? out_path
        # Make directory only only when copying a file to avoid making empty directories
        FileUtils.mkdir_p(File.dirname(out_path))
        FileUtils.cp(path, out_path)
      end
    end

    # Copy data files
    def copy_data_files(src_dir, extensions, out_dir)
      Dir.entries(src_dir).each do |entry|
        # Don't care about directories
        next if entry == '.' || entry == '..'
        path = "#{src_dir}/#{entry}"
        next if FileTest.directory? path

        # Skip invalid file extensions
        next unless extensions.include? File.extname(entry)[1..-1]

        # Copy the file if it doesn't already exist
        next if Util.join_path_nocase(out_dir, entry)

        FileUtils.cp(path, "#{out_dir}/#{entry}")
      end
    end

    # Get a full filename based on a short asset filename
    def get_asset_filename(fn)
      # Find the correct filename case
      dirname, basename = fn.split('/')
      if @patch_data_dir
        path = Util.join_path_nocase(@patch_data_dir, dirname)
        if path
          path = Util.join_path_nocase(path, basename)
          return path if path
        end
      end
      path = Util.join_path_nocase(@game_data_dir, dirname)
      if path
        path = Util.join_path_nocase(path, basename)
        return path if path
      end
      return nil
    end
  end
end
