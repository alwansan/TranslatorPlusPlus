#!/usr/bin/env ruby
# -*- coding: utf-8 -*-

require 'trollop'
require 'RGSS'

if ARGV.length <1 then
  puts <<-HEREDOC
  RVPACKER thin
  Based on rvpacker project:https://github.com/Solistra/rvpacker
  Mod by: Dreamsavior (https://dreamsavior.net)
  
  rvpacker is a tool to unpack & pack RPGMaker XP, VX, VX Ace data files into YAML format
  
  Options:
   --action, -a <s>		: Action to perform on project (unpack|pack)
   --project, -d <s>		: RPG Maker Project directory
   --force, -f			: Update target even when source is older than target
   --project-type, -t <s>	: Project type (vx|ace|xp)
   --help, -h			: Show this message
   --verbose, -V 		: Verbose
   --Target, -T			: Target directory to write into/from 
   
  Example:
    Unpacking:
      rvpacker --action unpack --project /path/to/your/game/folder --project-type ace
	  
    Unpacking to custom destination folder:
      rvpacker -a unpack -d /path/to/your/game/folder -p ace -T /destination/folder -V

    Unpack only Animations database:
      rvpacker -a unpack -d /path/to/your/game/folder -p ace -T /destination/folder -D animations -V
   
    Repacking:
      rvpacker --action pack --project /path/to/your/game/folder --project-type ace
		
  
  HEREDOC
  exit 1
end

opts = Trollop::options do
  opt :action, "Action to perform on project (unpack|pack)", :short => "a", :type => String
  opt :project, "RPG Maker Project directory", :short => "d", :type => String
  opt :force, "Update target even when source is older than target", :short => "f"
  opt :project_type, "Project type (vx|ace|xp)", :short => "t", :type => String
  opt :verbose, "Print verbose information while processing", :short => "V"
  opt :database, "Only work on the given database", :short => "D", :type => String
  opt :target, "Target directory to write into/from", :short => "T", :type => String
  opt :debug, "Enter debug mode", :short => "x"
end

if (opts[:debug]) then
	p __dir__
	puts "Please press enter to continue"
	a = gets.chomp
end

directions = {
  "unpack" => :all_bin_to_text,
  "pack" => :all_text_to_bin
}
projecttypes = {
  "vx" => :vx,
  "ace" => :ace,
  "xp" => :xp
}
$VERBOSE=opts[:verbose]

RGSS.serialize(projecttypes[opts[:project_type]],
               directions[opts[:action]],
               opts[:project],
               { :force => (opts[:force] ? true : false),
                 :line_width => -1,
                 :table_width => -1,
                 :database => opts[:database],
				 :target => (opts[:target] ? opts[:target] : opts[:project])
               }
               )
