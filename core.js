var bkg_page = chrome.extension.getBackgroundPage();
var bbsurl = 'http://www.mcbbs.net';

//API地址
var headurl = bbsurl+"/uc_server/avatar.php?uid=";//头像API
var userprofile = bbsurl+"/api/mobile/index.php?module=profile";//用户信息API
//每次调用API都将缓存消息、提醒、用户名等信息（反正有啥用得到的信息就缓存）

var mcbbs = new UserMCBBS(bbsurl, function () {
	$('#bbs-new-pm').text(mcbbs.pm > 0 ? '消息(' + mcbbs.pm + ')' : '消息');
	$('#bbs-new-notice').text(mcbbs.notice > 0 ? '提醒(' + mcbbs.notice + ')' : '提醒');
	if (mcbbs.userInfo) {
		$('#bbs-username').html(mcbbs.userInfo.username);
		$('#bbs-rank').html(mcbbs.userInfo.grouptitle);
		$('#bbs-avatar').attr('src', mcbbs.userInfo.avatar);

		$('#bbs-message-wrapper').show(100);
		$('#bbs-rank').show();

		$('#bbs-sign').removeAttr('disabled');
		$('#bbs-user-settings').removeAttr('disabled');
		$('#bbs-rank-progress-bar').css('width', mcbbs.userInfo.credits / mcbbs.userInfo.creditslower * 100 + '%');
		$('#bbs-rank-progress-bar a').html(mcbbs.userInfo.credits + '/' + mcbbs.userInfo.creditslower);
	} else {
		$('#bbs-username').html('请登录账号');
		$('#bbs-user-settings').hide();
		$('#bbs-sign').hide();
		$('#bbs-login').show(200);
	}
});

chrome.notifications.onButtonClicked.addListener(function (notifId, btnIdx) {
	if (notifId === myNotificationID) {
		if (btnIdx === 0) {
			chrome.tabs.create({url: bbsurl + "/home.php?mod=space&do=notice"});
		}
	}
});

document.addEventListener('DOMContentLoaded', function () {
    $('#bbs-open').click(OnClickOpenBBS);
    $('#bbs-sign').click(OnClickSign);
    $('#bbs-user-settings').click(OnClickSettings);
    $('#bbs-cyq-attack').click(OnClickCYQ);
    $('#bbs-rank').hover(OnMouseEnterExp, OnMouseLeaveExp);
    $('#bbs-login').click(OnClickLogin);
    $(function () {
        chrome.tabs.getSelected(null, function (a) {
            if (bbsurl.indexOf(a.url.match(/:\/\/(.[^\/]+)/)[1]) >= 0) {
                $("#bbs-open").hide();
				$("#bbs-cyq-attack").html(Math.random() > 0.4 ? "一键CYQ Attack" : "一键DDOC").show();
                $("#bbs-user-settings").show();
            } else {
                $("#bbs-cyq-attack").hide();
                $("#bbs-user-settings").hide();
            }
        });
        mcbbs.syncUserInfo();
	});
});

function CheckUpdate(){
	console.log("开始检查更新");
	/* 这里应该有一些检查更新的步骤的（读取插件的版本信息，而非读取保存的version） */

	/* 进行本地版本号检查以及是否是第一次使用检查 */

	var a = getOption("version");
	var b = String(chrome.app.getDetails().version);
	if(a==="0.0.0"){
		console.log("无版本号信息，正在进入向导模式");
		setOption("version",chrome.app.getDetails().version);
		chrome.tabs.create({url: chrome.extension.getURL("welcome.html?mod=fristrun")});
	}else{
		var c = compareVersion(a,b);
		if(c>0){
			console.log("更新完成，正在打开更新信息");
			chrome.tabs.create({url: chrome.extension.getURL("welcome.html?mod=new")});
			setOption("version",chrome.app.getDetails().version);
		}else if(c<0){
			console.log("新安装的为老旧版本");
			setOption("version",chrome.app.getDetails().version);
		}else{
			console.log("系统记录的版本与当前插件版本相同");	
		}
	}
	
}

function compareVersion(a, b) {
    if (a === b) return 0;
    for (var c = a.split("."), d = b.split("."), e = Math.min(c.length, d.length), f = 0; f < e; f++) {
        if (parseInt(c[f]) > parseInt(d[f])) return 1;
        if (parseInt(c[f]) < parseInt(d[f])) return - 1
    }

    return c.length > d.length ? 1 : c.length < d.length ? -1 : 0
}

function OnClickCYQ(){
	alert("啪，你死了，别说了。");
}

function OnMouseEnterExp(){
	$("#bbs-rank-progress-bar-wrapper").animate({  
		marginTop:'5px',  
		opacity:'1'
	});  
}

function OnMouseLeaveExp(){
	$("#bbs-rank-progress-bar-wrapper").animate({
		marginTop:'-5px',  
		opacity:'0'
	});  
}

function OnClickLogin(){
	var url = bbsurl;
	chrome.tabs.create({
        url: bbsurl+"/member.php?mod=logging&action=login"
    });
}

function OnClickSign(e){
	getNugget();
}

function OnClickOpenBBS(e){
	chrome.tabs.create({
		url:bbsurl
	});
}

function OnClickSettings(e){
	chrome.tabs.create({
		url:bbsurl+"/home.php?mod=spacecp"
	});
}

var myNotificationID = null;

function GetMessage() {
	console.log("开始获取新提醒 "+Date());
	mcbbs.syncUserInfo(function () {
		console.log(mcbbs.userInfo);
		var messageCount = Number(mcbbs.notice) + Number(mcbbs.pm);
		if (messageCount > 0) {
			chrome.notifications.create({
				type: "basic", 
				iconUrl: "icon.png", 
				title: "MCBBS扩展插件",
				buttons: [{title: "点击查看"}], 
				message: "你有" + messageCount + "条新提醒，请点击查看！"
			}, function (id) {
				myNotificationID = id;
				setTimeout(function() {
					chrome.notifications.clear(id);
				}, 10000); 
			});
		}
	});
}

function getNugget() {
	console.log("开始自动签到");
	$.get(bbsurl + '/home.php?mod=task&do=apply&id=10').fail(getNuggetFailed).done(function (data) {
		$.get(bbsurl + '/home.php?mod=task&do=draw&id=10').fail(getNuggetFailed).done(function () {
			var regex = /<div id="messagetext" class="alert_\w*">\s*<p>([^<]*)/;
			var result = (regex.exec(data) || [])[1];

			mcbbs.syncUserInfo(function () {
				chrome.notifications.create({
					type: "basic",
					iconUrl: mcbbs.userInfo.avatar,
					title: "每日金粒领取 - " + new Date().toLocaleDateString(),
					message: result
				});
			});
		});
	});
}

function getNuggetFailed() {
	chrome.notifications.create({
		type: "basic",
		iconUrl: "icon.png",
		title: "获取金粒失败",
		message: "网络出错了？"
	});
}
