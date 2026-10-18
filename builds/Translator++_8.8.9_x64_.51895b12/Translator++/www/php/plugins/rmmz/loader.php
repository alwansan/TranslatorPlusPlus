<?php
$THISPATH = pathinfo(__FILE__);
clearstatcache(true);

include($THISPATH['dirname']."/extractor.php");
include($THISPATH['dirname']."/applier.php");
include($THISPATH['dirname']."/utility.php");
$_PARAM['ACCEPTED_EXTENSION'][] = "json";
$_PARAM['PHRASE_CACHE'] = array();
$_PARAM['LINEBREAK'] = "\r\n";
$_PARAM['RPGM_EVENT_CODE'][0]="Empty";
$_PARAM['RPGM_EVENT_CODE'][101]="Show Text Attributes";
$_PARAM['RPGM_EVENT_CODE'][102]="Show Choices";
$_PARAM['RPGM_EVENT_CODE'][103]="Input Number";
$_PARAM['RPGM_EVENT_CODE'][104]="Select Key Item";
$_PARAM['RPGM_EVENT_CODE'][105]="Show Scrolling Text Attributes";
$_PARAM['RPGM_EVENT_CODE'][108]="Comment";
$_PARAM['RPGM_EVENT_CODE'][111]="Conditional Branch";
$_PARAM['RPGM_EVENT_CODE'][112]="Loop";
$_PARAM['RPGM_EVENT_CODE'][113]="Break Loop";
$_PARAM['RPGM_EVENT_CODE'][115]="Exit Event Processing";
$_PARAM['RPGM_EVENT_CODE'][117]="Call Common Event";
$_PARAM['RPGM_EVENT_CODE'][118]="Label";
$_PARAM['RPGM_EVENT_CODE'][119]="Jump to Label";
$_PARAM['RPGM_EVENT_CODE'][121]="Control Switches";
$_PARAM['RPGM_EVENT_CODE'][122]="Control Variables";
$_PARAM['RPGM_EVENT_CODE'][123]="Control Self Switch";
$_PARAM['RPGM_EVENT_CODE'][124]="Control Timer";
$_PARAM['RPGM_EVENT_CODE'][125]="Change Gold";
$_PARAM['RPGM_EVENT_CODE'][126]="Change Items";
$_PARAM['RPGM_EVENT_CODE'][127]="Change Weapons";
$_PARAM['RPGM_EVENT_CODE'][128]="Change Armor";
$_PARAM['RPGM_EVENT_CODE'][129]="Change Party Member";
$_PARAM['RPGM_EVENT_CODE'][132]="Change Battle BGM";
$_PARAM['RPGM_EVENT_CODE'][133]="Change Battle End ME";
$_PARAM['RPGM_EVENT_CODE'][134]="Change Save Access";
$_PARAM['RPGM_EVENT_CODE'][135]="Change Menu Access";
$_PARAM['RPGM_EVENT_CODE'][136]="Change Encounter";
$_PARAM['RPGM_EVENT_CODE'][137]="Change Formation Access";
$_PARAM['RPGM_EVENT_CODE'][138]="Change Window Color";
$_PARAM['RPGM_EVENT_CODE'][201]="Transfer Player";
$_PARAM['RPGM_EVENT_CODE'][202]="Set Vehicle Location";
$_PARAM['RPGM_EVENT_CODE'][203]="Set Event Location";
$_PARAM['RPGM_EVENT_CODE'][204]="Scroll Map";
$_PARAM['RPGM_EVENT_CODE'][205]="Set Move Route";
$_PARAM['RPGM_EVENT_CODE'][206]="Get on/off Vehicle";
$_PARAM['RPGM_EVENT_CODE'][211]="Change Transparency";
$_PARAM['RPGM_EVENT_CODE'][212]="Show Animation";
$_PARAM['RPGM_EVENT_CODE'][213]="Shot Balloon Icon";
$_PARAM['RPGM_EVENT_CODE'][214]="Erase Event";
$_PARAM['RPGM_EVENT_CODE'][216]="Change Player Followers";
$_PARAM['RPGM_EVENT_CODE'][217]="Gather Followers";
$_PARAM['RPGM_EVENT_CODE'][221]="Fadeout Screen";
$_PARAM['RPGM_EVENT_CODE'][222]="Fadein Screen";
$_PARAM['RPGM_EVENT_CODE'][223]="Tint Screen";
$_PARAM['RPGM_EVENT_CODE'][224]="Flash Screen";
$_PARAM['RPGM_EVENT_CODE'][225]="Shake Screen";
$_PARAM['RPGM_EVENT_CODE'][230]="Wait";
$_PARAM['RPGM_EVENT_CODE'][231]="Show Picture";
$_PARAM['RPGM_EVENT_CODE'][232]="Move Picture";
$_PARAM['RPGM_EVENT_CODE'][233]="Rotate Picture";
$_PARAM['RPGM_EVENT_CODE'][234]="Tint Picture";
$_PARAM['RPGM_EVENT_CODE'][235]="Erase Picture";
$_PARAM['RPGM_EVENT_CODE'][236]="Set Weather Effects";
$_PARAM['RPGM_EVENT_CODE'][241]="Play BGM";
$_PARAM['RPGM_EVENT_CODE'][242]="Fadeout BGM";
$_PARAM['RPGM_EVENT_CODE'][243]="Save BGM";
$_PARAM['RPGM_EVENT_CODE'][244]="Replay BGM";
$_PARAM['RPGM_EVENT_CODE'][245]="Play BGS";
$_PARAM['RPGM_EVENT_CODE'][246]="Fadeout BGS";
$_PARAM['RPGM_EVENT_CODE'][249]="Play ME";
$_PARAM['RPGM_EVENT_CODE'][250]="Play SE";
$_PARAM['RPGM_EVENT_CODE'][251]="Stop SE";
$_PARAM['RPGM_EVENT_CODE'][261]="Play Movie";
$_PARAM['RPGM_EVENT_CODE'][281]="Change Map Display";
$_PARAM['RPGM_EVENT_CODE'][282]="Change Tileset";
$_PARAM['RPGM_EVENT_CODE'][283]="Change Battle Back";
$_PARAM['RPGM_EVENT_CODE'][284]="Change Parallax Back";
$_PARAM['RPGM_EVENT_CODE'][285]="Get Location Info";
$_PARAM['RPGM_EVENT_CODE'][301]="Battle Processing";
$_PARAM['RPGM_EVENT_CODE'][302]="Shop Processing";
$_PARAM['RPGM_EVENT_CODE'][303]="Name Input Processing";
$_PARAM['RPGM_EVENT_CODE'][311]="Change HP";
$_PARAM['RPGM_EVENT_CODE'][312]="Change MP";
$_PARAM['RPGM_EVENT_CODE'][313]="Change State";
$_PARAM['RPGM_EVENT_CODE'][314]="Recover All";
$_PARAM['RPGM_EVENT_CODE'][315]="Change EXP";
$_PARAM['RPGM_EVENT_CODE'][316]="Change Level";
$_PARAM['RPGM_EVENT_CODE'][317]="Change Parameters";
$_PARAM['RPGM_EVENT_CODE'][318]="Change Skills";
$_PARAM['RPGM_EVENT_CODE'][319]="Change Equipment";
$_PARAM['RPGM_EVENT_CODE'][320]="Change Actor Name";
$_PARAM['RPGM_EVENT_CODE'][321]="Change Actor Class";
$_PARAM['RPGM_EVENT_CODE'][322]="Change Actor Graphic";
$_PARAM['RPGM_EVENT_CODE'][323]="Change Vehicle Graphic";
$_PARAM['RPGM_EVENT_CODE'][324]="Change Actor Nickname";
$_PARAM['RPGM_EVENT_CODE'][325]="Change Actor Profile";
$_PARAM['RPGM_EVENT_CODE'][331]="Change Enemy HP";
$_PARAM['RPGM_EVENT_CODE'][332]="Change Enemy MP";
$_PARAM['RPGM_EVENT_CODE'][333]="Change Enemy State";
$_PARAM['RPGM_EVENT_CODE'][334]="Enemy Recover All";
$_PARAM['RPGM_EVENT_CODE'][335]="Enemy Appear";
$_PARAM['RPGM_EVENT_CODE'][336]="Enemy Transform";
$_PARAM['RPGM_EVENT_CODE'][337]="Show Battle Animation";
$_PARAM['RPGM_EVENT_CODE'][339]="Force Action";
$_PARAM['RPGM_EVENT_CODE'][340]="Abort Battle";
$_PARAM['RPGM_EVENT_CODE'][351]="Open Menu Screen";
$_PARAM['RPGM_EVENT_CODE'][352]="Open Save Screen";
$_PARAM['RPGM_EVENT_CODE'][353]="Game Over";
$_PARAM['RPGM_EVENT_CODE'][354]="Return to Title Screen";
$_PARAM['RPGM_EVENT_CODE'][355]="Script Header";
$_PARAM['RPGM_EVENT_CODE'][356]="Plugin Command";
$_PARAM['RPGM_EVENT_CODE'][401]="Show Text";
$_PARAM['RPGM_EVENT_CODE'][402]="Choice";
$_PARAM['RPGM_EVENT_CODE'][403]="Choice Cancel";
$_PARAM['RPGM_EVENT_CODE'][404]="Choices End";
$_PARAM['RPGM_EVENT_CODE'][405]="Show Scrolling Text";
$_PARAM['RPGM_EVENT_CODE'][408]="Comment More";
$_PARAM['RPGM_EVENT_CODE'][411]="Else";
$_PARAM['RPGM_EVENT_CODE'][412]="Branch End";
$_PARAM['RPGM_EVENT_CODE'][413]="Repeat Above";
$_PARAM['RPGM_EVENT_CODE'][601]="If Win";
$_PARAM['RPGM_EVENT_CODE'][602]="If Escape";
$_PARAM['RPGM_EVENT_CODE'][603]="If Lose";
$_PARAM['RPGM_EVENT_CODE'][604]="Battle Processing End";
$_PARAM['RPGM_EVENT_CODE'][605]="Shop Item";
$_PARAM['RPGM_EVENT_CODE'][655]="Script";

if (is_file($_GET['gameFolder']."\\data\\System.json")) {
	$_PARAM['MV_ROOT']  = $_GET['gameFolder'];
} elseif (is_file($_GET['gameFolder']."\\data\\System.json")) {
	$_PARAM['MV_ROOT']  = $_GET['gameFolder'];
}


function fetchData($data, $parentContext="") {

}


function loader($content) {
	
}