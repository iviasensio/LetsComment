var config = {
	host: window.location.hostname,
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};

var arrayValidCharts =  ["map","table", "pivot-table", "barchart","boxplot","combochart","distributionplot","gauge","piechart","scatterplot","treemap","histogram","linechart","kpi","waterfallchart"];
var currentUser;
var onlyUser;
var oldFontSize;
var oldCommentView = null;
var oldCommentLevel = null;
var initFirebase;
var rendered;
var editMode = 0;
var oldCommentRef;
var ref;
var oldRef;
var currentObjectId;
var commentsArray = new Array();
var currentGroups = new Array();
var currentGroupsReceiv = new Array();
var currentGroupsOwners = new Array();
var favorites = [{}];
var currentSelections = '';
var modalName = '';
var checkTooltipSheet = true;
var privacy = 'unlocked';
var receiv = '';
var groupName = '';
var vGroupOwner = '';
var app;
var appId;
var enigma;
var version;
var oneOpened = false;
var millisecToDays = 86400000;

require.config({
	paths: {
		'firebase': 'https://www.gstatic.com/firebasejs/5.5.6/firebase'
	}
})

define( ["jquery",
		 "qlik",
		 "css!./LetsComment.css",
		 'firebase',
		 './config'
		 ],
	
	function (jquery,qlik,cssContent,firebase,configfile) {
		if(!app){
			app = qlik.currApp(this);
			appId = app.id;
			appId = appId.replace('.','');//dots are not allowed
		}
		
		var global = qlik.getGlobal(config);		
		var urlPath = global.session.options.reloadURI;
		var globalPath = urlPath.substring(0,urlPath.indexOf('/sense/'));

		global.getAuthenticatedUser(async function (reply) {
		
			currentUser = reply.qReturn;
			currentUser = currentUser.replace('UserDirectory=', '');
			currentUser = currentUser.replace('; UserId=', '_');
			onlyUser = currentUser.substring(currentUser.indexOf('_')+1);
			vGroupOwner = currentUser;
		});
		
		//version control coded by Riley MacDonald
		if (parseInt(version) <= 122447){		
			$(".qui-buttonset-right").prepend($("<button id = 'butLightBulb' class='lui-button lui-button--toolbar iconToTheRight npsod-bar-btn lui-icon lui-icon--lightbulb'><span data-icon='toolbar-print'></span></button>"));
		}else{
			$(".qs-toolbar__right").prepend($("<button id = 'butLightBulb' class='lui-button qs-toolbar__element iconToTheRight npsod-bar-btn lui-icon lui-icon--lightbulb'><span data-icon='toolbar-print'></span></button>"));
		}
		async function toggleId () {	
						
			if (!initFirebase) {
				firebase = await firebase.initializeApp(config);
				initFirebase = true;
				// Sign into Firebase
				firebase.auth().signInAnonymously().catch(function (error) {											
					var errorCode = error.code;
					var errorMessage = error.message;											
				});				
			}	
			if(document.getElementById('flagId')){								
				document.getElementById('flagId').remove();
				$( '.lui-icon--group' ).remove();
				$( '.LetsComment-tooltip-comments' ).remove();
			}
			if(document.getElementById('messageId')){								
				$( '.LetsComment-tooltip-comments' ).remove();
			}
			
			var ancho = '130px';
			var cnt = $( ".LetsComment-tooltip" ).remove();
			
			if ( cnt.length === 0) {
				//var cnt = $( ".LetsComment-tooltip" ).remove();
				$(".buttons-end").append( '<div class="LetsComment-tooltip" style = "float:left;position:relative;right:0%;padding: 12px 15px;">' +
					'<a class="LetsComment-btn-sheet" style = "bottom:0px" title="properties"><i id = "flagId" class="lui-icon lui-icon--group">send</i></a>' +							
					"</div>" );

				$('.LetsComment-btn-sheet').click(function() {
					var x = document.getElementsByClassName("LetsComment-modalBase");
    				if(x.length == 0){
						var sheet_id = qlik.navigation.getCurrentSheetId();
						var loop = true;

						$( '.sheet-grid' ).each( function (ih, elh ) {	
							if(loop){
								var sh = angular.element( elh ).scope();					
								onceQlik(sh.model);
								loop = false;
							}
						})					
					}
				})
                                
				$( '.qv-object,.qv-panel-sheet' ).each( async function ( i, pl ) {
					var s = angular.element( pl ).scope();					
					if (s.layout || (s.$$childHead && s.$$childHead.layout)) {						
						if(arrayValidCharts.indexOf(s.model.layout.qInfo.qType) >= 0){
							var dlayoutId = s.layout.qInfo.qId;				
							$( pl ).append('<div id = "messageId" class="LetsComment-tooltip-comments"><img title = "Current month messages" class = "icons-comment" src="/Extensions/LetsComment/icons/messge.png"><div id = "totalMessages_' + dlayoutId + '" class = "top-right red-circle">0</div></div>');
							lastTen = await read10dayComments(dlayoutId);							
							$(pl.children[2]).on('click', function(){
								if(!oneOpened){
									onceQlik(s.model);							
								}
							})	
						}
										
					} 
				});
				async function read10dayComments(dlayoutId){

					readlastten = {
						"readlastTen": appId + '/' + dlayoutId
					}					
					var query = firebase.database().ref(readlastten.readlastTen).orderByKey();
					
					query.once("value")
					  	.then(function(snapshot) {
					  		var hmm = 0;
					  		if(snapshot.node_.children_.root_.key){//if there are any comments in that chart						  		
						  		var today = new Date();							  		
								var todayMilliSecs = today.getTime();								
								
							    snapshot.forEach(function(childSnapshot) {	
							    	var dateSaved = childSnapshot.key;
							  		var dateMilli = dateSaved.substring(11,24);
							  		var daysAgo = (todayMilliSecs / millisecToDays) - ( dateMilli / millisecToDays);

							    	if(daysAgo <= 30){
							    		var receiverMatch = false;
							      		if(childSnapshot.val().public == 'group'){
							      			var receiverLength = childSnapshot.val().receivers;
							      			var s = receiverLength;
										    var match = s.split(',')												    
										    for (var a in match)
										    {
										    	if(onlyUser == match[a]){
										        	receiverMatch = true;									        	
										        }
										    }									      			
							      		}
					
										if(currentUser == childSnapshot.val().user || childSnapshot.val().public == 'unlocked' || receiverMatch){
							      			hmm++;
							      		}
							      	}
							    })
							}					    
						    var elemId = "totalMessages_" + dlayoutId;
						    var rightMargin = '';
						    var fontSize = '';
						    var back_Msg_Color = 'red';
				
						    if(hmm > 999){
						    	hmm = '1k';
						    }
						    if(hmm == 0){
						    	back_Msg_Color = '#ccc'
						    }
						    
						    var div10 = document.getElementById(elemId);
						    if(div10){
						    	div10.innerHTML  = hmm;
						    	div10.style.background = back_Msg_Color;
						    }
						})
						
				}
				function onceQlik(model){
					oneOpened = true;
					model.getProperties().then( function ( reply ) {						
						if(!app){
							app = qlik.currApp(this);
							appId = app.id;
						}
						
						var vObjectId = reply.qInfo.qId;
						var vObjectType = reply.qInfo.qType;
						var vObjectTitle;								
						var vHeaderTitle;
						if(vObjectType == 'sheet'){
							vObjectTitle = reply.qMetaDef.title;	
						}else{
							vObjectTitle = reply.title;
						}
						if(!vObjectTitle){
							vObjectTitle = ' no title'
						}
						vHeaderTitle = 'Qlik Chat - ' + vObjectType + ' : ' + vObjectTitle;	
																		
						currentObjectId = vObjectId;								
						
						app.getObject('CurrentSelections').then(async function(model){
							var QVLetsComment01 = app.getObject( 'QVLetsComment01', vObjectId );
							if (initFirebase) {
								readAllGroups();										
								readAllComments();								
							}		
							//myModalBase
							modalName = 'modal_' + currentObjectId;
							var vBackgroundColor = 'rgb(252,250,237)';
							if(vObjectType == 'sheet'){
								vBackgroundColor = 'rgb(251, 251, 255)';
							}
							var vModalBase = '<div id="' + modalName + '" class="LetsComment-modalBase navbar-collapse collapse twbs">' +
							'<div class="LetsComment-base-content">' +
							  '<div class="LetsComment-modal-header">' +
							    '<span>' + vHeaderTitle + '</span>'+

								'<a>' +
									'<span id = "baseModalClose" name = "' + modalName + '" class="lui-clear-all lui-icon lui-icon--remove close"></span>' +
								'</a>' +
							      	'<input id = "searchText" type="text" style = "padding-left:5px;border-radius: 10px;margin-top: 10px;width: 165px;float: right;" placeholder="Search text">' + 										
							  '</div>' +
							  '<div class="LetsComment-modal-body" style = "background-color: ' + vBackgroundColor + '">' +
							    '<div id = "box_' + currentObjectId + '" class="box">';
																			        
							vModalBase += '</div></div>';
							
							vModalBase += '<div class="LetsComment-modal-footer">' +
							     '<span>'+									     	
							     	'<img id = "' + privacy + '" title = "' + groupName + '" class = "icons" src="/Extensions/LetsComment/icons/' + privacy + '.png">' + 
							     	'<img id = "like" class = "icons" src="/Extensions/LetsComment/icons/like2.png" style = "padding-left:5px">' + 
							     	'<input rows="1" class = "inputComment" cols="70" wrap="soft" id="TypeComment" value="" placeholder="Type your comment">' +
	                    			'</input>' +
	                    			'<img id = "picture" class = "icons" src="/Extensions/LetsComment/icons/picture.png">' + 
	                    			'<img id = "send" class = "icons" src="/Extensions/LetsComment/icons/send.png">' + 
	                    			'<p id = "currentSel" style = "color:blue;font-size:15px;font-weight: normal"></p>' +
							     '</span>' +
							  '</div>' ;
							vModalBase += '</div></div>';  
							$( document.body ).append( vModalBase );		
							var vSearch   = document.getElementById("searchText");
							var modalBase = document.getElementById(modalName);												
							var spanBase  = document.getElementById("baseModalClose");
							var vLock     = document.getElementById(privacy);
							var vLike     = document.getElementById("like");
							var vPicture  = document.getElementById("picture");
							var vSend     = document.getElementById("send");
							var vTypeTXT  = document.getElementById("TypeComment");
							
							modalBase.style.display = "block";								
						
							if (!initFirebase) {
								firebase = await firebase.initializeApp(config);
								initFirebase = true;
								
								firebase.auth().signInAnonymously().catch(function (error) {											
									var errorCode = error.code;
									var errorMessage = error.message;											
								});
								readAllGroups();
								readAllComments();
								
							}

							var modalName2 = "#" + modalName;
							$(modalName2).draggable({
							    handle: ".LetsComment-modal-header"
							});
							vSearch.onchange = function() {								
								var vSearchTxt = document.getElementById("searchText").value.toUpperCase();
																		
								//walk through the bullets and just hide the ones that does not contain the search text
								var allBulletsR = document.getElementsByClassName("LetsComment-bullet");
								for (var i = 0; i < allBulletsR.length; i++) {
								    var aaa = allBulletsR[i].innerHTML.toUpperCase();
								    if(aaa.indexOf(vSearchTxt) >= 0 || vSearchTxt.length == 0){
								    	$(allBulletsR[i]).show();
								    }else{
								    	$(allBulletsR[i]).hide();
								    }
								}								
							}
							spanBase.onclick = async function() {
								var parName = '#' +spanBase.getAttribute('name');
								$( parName ).remove();
								oneOpened = false;
								
								//Refresh the list of current month messages
								$( '.qv-object,.qv-panel-sheet' ).each( async function ( i, pl ) {
									var s = angular.element( pl ).scope();					
									if (s.layout || (s.$$childHead && s.$$childHead.layout)) {						
										if(arrayValidCharts.indexOf(s.model.layout.qInfo.qType) >= 0){
											var dlayoutId = s.layout.qInfo.qId;				
											lastTen = await read10dayComments(dlayoutId);
										}															
									} 
								})								
							}
							vLock.onclick = async function() {
								getNewPrivacy();								
							}
							vLock.onmouseover  = async function() {
								console.log(groupName);
							}
							async function getNewPrivacy(){
								var newGroupName = '';
								var privacyOld = privacy;
								var vModalPriv = document.createElement('div');
								var vCurrentChecked0 = '';
								var vCurrentChecked1 = '';
								var vCurrentChecked2 = '';
								if(privacy == 'unlocked'){
									vCurrentChecked0 = 'checked';
									vCurrentChecked1 = '';
									vCurrentChecked2 = '';
								}else{
									if(privacy == 'locked'){
										vCurrentChecked0 = '',
										vCurrentChecked1 = 'checked';
										vCurrentChecked2 = '';
									}else{
										vCurrentChecked0 = '';
										vCurrentChecked1 = '';
										vCurrentChecked2 = 'checked';												
									}
								}
								
								var vModalText =  '<div id="myModalPrivate" class="modalPrivate">' +
									'<div class="modalPrivate-content">' +										  			
							  		'<div class="modalPrivate-body">' +
							    		'<div id = "boxPriv"class="modalPrivate-box">' + 
										 	'<form action="" id = "formPriv" class = "modalPrivate-form">' +
											  	'<input type="radio" name="PrivateType" value="0" ' + vCurrentChecked0 + '> Public<br>' +
											  	'<input type="radio" name="PrivateType" value="1" ' + vCurrentChecked1 + ' style = "margin-top:15px"> Only me<br>' +
											  	'<input type="radio" name="PrivateType" value="2" ' + vCurrentChecked2 + ' style = "margin-top:15px"> Specific people<br>' +
											  	
											  	'<div class="form-group" style="width:200px"><br>' +
											  		'<label>Select a current group</label>' +		
											  		'<select class="form-control lui-input lui-input-group__item lui-input-group__input" style = "margin-top: 5px" id="comboCurrentGroups" required="required">' +						                    	
														'<option value=99999>Chose a current group</option>';																
														for(var ah = 0;ah < currentGroups.length;ah++){																	
															vModalText += '<option value=' + ah + '> ' + currentGroups[ah] + ' </option>';
														}
													vModalText += '</select><br>' +  
													
													'<textarea id = "specificPeopleArea" disabled="" class="expression-editor-function-definition lui-textarea lui-disabled ng-binding textAreaUsers">users</textarea>' +
													'<br>' +

													'<div>' +
														'<label>Create new group</label>' +
														'<div style = "margin-top: 5px">' +
															'<div class="lui-input-group">' +
																'<input id = "specificGroup" class="lui-input lui-input-group__item lui-input-group__input" type="text" placeholder="group name">' +
																'<button id = "createNewGroup" class="lui-button lui-input-group__item  lui-input-group__button" type="button">' +
																	'<span class="lui-button__icon  lui-icon  lui-icon--plus" q-title-translation="Tooltip.AddTag" title="Add tag"></span>' +
																'</button>' +																	
															'</div>' +
														'</div>' +																													
													'</div>' +
													'<br>' +
													'<div style = "width: 400px">' +
														'<label>Group members / Occasional receivers (", separated")</label>' +
														'<div style = "margin-top: 5px;width:300px">' +
															'<div class="lui-input-group">' +
																'<input id = "specificPeople" class="lui-input lui-input-group__item lui-input-group__input" type="text" placeholder="user1, user2,...">' +
																'<div class="lui-buttongroup">' +
																	'<button id="updateGroup" class="lui-button lui-buttongroup__button ng-scope" type="button">' +
																		'<span class="lui-icon lui-icon--reload" title="Update group members"></span>' +
																	'</button>' +
																	'<button id="deleteGroup" class="lui-button lui-buttongroup__button lui-button--rounded ng-scope" type="button" style = "position:absolute">' +
																		'<span class="lui-icon lui-icon--bin" title="Delete group"></span>' +
																	'</button>' +
																'</div>' +																
															'</div>' +
														'</div>' +																													
													'</div>' +

													'<br><p id = "ownerInfo" style="font-weight:bold;width:400px">Owner : ' + vGroupOwner + '</p>' +															
													
												'</div>' +														  	
											'</form>'+
											
										'</div>' +
								 	'</div>' +
									'<div class="modalPrivate-footer">' +
									     '<span style="float:right">'+									     										     	
											'<button id = "escPrivButton" class="lui-button cancel button ng-scope" style = "top:13px" name="cancelButton" q-translation="Common.Cancel">Cancel</button>' +
											'<button id = "sendPrivButton" class="lui-button confirm button ng-scope" style = "top:13px;margin-left:20px" name="confirmButton" q-translation="Common.Apply">Apply</button>' +
									     '</span>' +
									'</div>' +
																					 	
								'</div></div>';
									
								$(".LetsComment-modalBase").append( vModalText );
																			
								var vModalPriv = document.getElementById("myModalPrivate");
								var vComboGr   = document.getElementById("comboCurrentGroups");
								var vSendPriv  = document.getElementById("sendPrivButton");
								var vNewGroup  = document.getElementById("createNewGroup");
								var vUpdGroup  = document.getElementById("updateGroup");
								var vDelGroup  = document.getElementById("deleteGroup");
								var vEscPriv   = document.getElementById("escPrivButton");	
																												

								vModalPriv.style.display = "block";
								
								if(currentUser != vGroupOwner){
									$('#updateGroup').hide();
									$('#deleteGroup').hide();
																			
								}else{
									if(vComboGr.selectedIndex == 0)	{											
										$('#updateGroup').hide();
										$('#deleteGroup').hide();
										document.getElementById("ownerInfo").value = ''
									}else{
										$('#updateGroup').show();
										$('#deleteGroup').show();
										document.getElementById("ownerInfo").value = 'Owner : ' + currentGroupsOwners[(this.selectedIndex - 1)];	
									}
								}

								vComboGr.onchange = async function() {
									if(this.selectedIndex > 0){
										groupName = currentGroups[(this.selectedIndex - 1)];											
										vGroupOwner = currentGroupsOwners[(this.selectedIndex - 1)];												
										
										document.getElementById("specificPeopleArea").value = currentGroupsReceiv[(this.selectedIndex - 1)];
										document.getElementById("specificPeople").value = currentGroupsReceiv[(this.selectedIndex - 1)];
										var theDivOwner = document.getElementById("ownerInfo");						
										theDivOwner.innerHTML = 'Owner : ' + vGroupOwner;
										if(currentUser != vGroupOwner){																			
											$('#updateGroup').hide();
											$('#deleteGroup').hide();																						
										}else{
											$('#updateGroup').show();
											$('#deleteGroup').show();																								
										}
										var vVarOption = document.getElementById("formPriv");
										vVarOption.elements[0].checked = false;
										vVarOption.elements[1].checked = false;
										vVarOption.elements[2].checked = true;
									}else{											
										vGroupOwner = '';
										groupName = '';
										document.getElementById("specificPeopleArea").value = 'users';
										document.getElementById("specificPeople").value = '';
										var theDivOwner = document.getElementById("ownerInfo");						
										theDivOwner.innerHTML = 'Owner : ' + currentUser;
										$('#updateGroup').hide();
										$('#deleteGroup').hide();
										document.getElementById("ownerInfo").value = '';	
									}																						
								}
								vUpdGroup.onclick = async function() {
									
									var vUpdUsersTxt = document.getElementById("specificPeople").value;
									document.getElementById("specificPeopleArea").value = vUpdUsersTxt;
									var creatime = new Date().toLocaleString();
									updgroup = await writeNewGroup(groupName, vUpdUsersTxt, currentUser, creatime);
									if(vUpdUsersTxt){
										var indexSliceGroup = currentGroups.indexOf(groupName);											
										currentGroupsReceiv[indexSliceGroup] = vUpdUsersTxt;	
										var vVarOption = document.getElementById("formPriv");
										vVarOption.elements[0].checked = false;
										vVarOption.elements[1].checked = false;
										vVarOption.elements[2].checked = true;									
									}else{
										alert("Please chose type a set of receivers!")
									}
								}
								vDelGroup.onclick = async function() { 											
									delgr = {
										"delGr": 'UserGroups' + '/' + appId + '/' + groupName
									}											
									firebase.database().ref(delgr.delGr).remove();
									var indexSliceGroup = currentGroups.indexOf(groupName);
									currentGroups.splice(indexSliceGroup,1);
									currentGroupsReceiv.splice(indexSliceGroup,1);
									currentGroupsOwners.splice(indexSliceGroup,1);												
									vComboGr.remove((indexSliceGroup + 1));
									document.getElementById("specificPeople").value = '';
									document.getElementById("specificPeopleArea").value = '';
								}
								
								vSendPriv.onclick = async function() {
									var vUsersAlert  = document.getElementById("specificPeople").value;
									var vGroupTxt  = document.getElementById("specificGroup").value;
									
									var vUsersTxt  = document.getElementById("specificPeopleArea").value;									

									if(vComboGr.selectedIndex == 0)	{	
										vUsersTxt  = document.getElementById("specificPeople").value;
										groupName = vUsersTxt;
									}										
									var vGroupTxt  = '';
									var vVarOption = document.getElementById("formPriv");
									document.getElementById("specificPeople").value = '';
																															
									if(vVarOption.elements[0].checked){
										privacy = 'unlocked';
										receiv = '';
										groupName = '';
										document.getElementById("ownerInfo").value = ''												
									}
									if(vVarOption.elements[1].checked){
										privacy = 'locked';
										receiv = '';
										groupName = '';							
									}
									if(vVarOption.elements[2].checked){	
										if(vUsersTxt.length>0){
											privacy = 'group';
											receiv = vUsersTxt;													
										}else{
											alert('Please select a valid set of users')
											return;
										}
									}
										
									var vOldLockBut = document.getElementById(privacyOld);
									vOldLockBut.src = globalPath + '/Extensions/LetsComment/icons/' + privacy + '.png';
									vOldLockBut.id = privacy;
									document.getElementById(privacy).title = groupName

									$( "#myModalPrivate" ).remove();
									var theFocus = document.getElementById("TypeComment");
									theFocus.focus();
								}
								vNewGroup.onclick = async function() {
									
									var vGroupTxt  = document.getElementById("specificGroup").value;
									var vUsersTxt  = document.getElementById("specificPeople").value;											
									if(vGroupTxt && vUsersTxt){
										//mira si exite 
										
										var found = currentGroups.indexOf(vGroupTxt);
										
										//crealo
										if(found < 0){
											
											var creatime = new Date().toLocaleString();																								
											newgroup = await writeNewGroup(vGroupTxt, vUsersTxt, currentUser, creatime);
											groupName = vGroupTxt;
											vGroupOwner = currentUser;
											currentGroups.push(groupName);
											currentGroupsReceiv.push(vUsersTxt);
											currentGroupsOwners.push(currentUser);
											var indexAddGroup = currentGroups.indexOf(groupName);
										    var option = document.createElement('option');
										    option.text = groupName;
										    option.value = indexAddGroup;
										    vComboGr.add(option, (indexAddGroup + 1));
										
										    vComboGr.selectedIndex = (indexAddGroup + 1);
										    var theDivOwner = document.getElementById("ownerInfo");						
											theDivOwner.innerHTML = 'Owner : ' + currentUser;
								
										    document.getElementById("specificPeopleArea").value = vUsersTxt;
										   
										    document.getElementById("specificGroup").value = '';
										    var vVarOption = document.getElementById("formPriv");
											vVarOption.elements[0].checked = false;
											vVarOption.elements[1].checked = false;
											vVarOption.elements[2].checked = true;
											$('#updateGroup').show();
											$('#deleteGroup').show();	
										}else{
											alert('This group already exists!');
										}
									}else{
										alert("Please chose a group name and a set of receivers!")
									}
								}
								vEscPriv.onclick = function() {
									$( "#myModalPrivate" ).remove();	
									var theFocus = document.getElementById("TypeComment");
									theFocus.focus();											
								}	
																	
								async function writeNewGroup(group, users, user, time) {
								
									refgroup = {
										"writeGroup": 'UserGroups' + '/' + appId + '/' + group											
									}
								
									firebase.database().ref(refgroup.writeGroup).set({
										members: users,
										owner: user,	
										created: time											
									}, function (error) {
										if (error) {
											console.log('failure to create group')
										}
										else {
											console.log('group created')
										}
									})
								}										

							}
							vLike.onclick = async function() {													
									milliseconds = new Date().toLocaleString();											
									var vpublic = privacy;	
									var vusers = receiv;
									var like = '-##like2##-';
									var comment = '';
									comments = await writeNewComment(milliseconds, currentUser, comment, like, vpublic, vusers);
									var theSel = document.getElementById("currentSel");																
							}
							vPicture.onclick = async function() {	
								currentSelections = await getCurrentSelections();
								if(currentSelections == '-'){
									currentSelections = '';
								}
								var theSel = document.getElementById("currentSel");						
								theSel.innerHTML = currentSelections.substring(0,60);	

								var getFromBetween = {
								    results:[],
								    string:"",
								    getFromBetween:function (sub1,sub2) {
								        if(this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return false;
								        var SP = this.string.indexOf(sub1)+sub1.length;
								        var string1 = this.string.substr(0,SP);
								        var string2 = this.string.substr(SP);
								        var TP = string1.length + string2.indexOf(sub2);
								        return this.string.substring(SP,TP);
								    },
								    removeFromBetween:function (sub1,sub2) {
								        if(this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return false;
								        var removal = sub1+this.getFromBetween(sub1,sub2)+sub2;
								        this.string = this.string.replace(removal,"");
								    },
								    getAllResults:function (sub1,sub2) {
								        // first check to see if we do have both substrings
								        if(this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return;

								        // find one result
								        var result = this.getFromBetween(sub1,sub2);
								        // push it to the results array
								        this.results.push(result);
								        // remove the most recently found one from the string
								        this.removeFromBetween(sub1,sub2);

								        // if there's more substrings
								        if(this.string.indexOf(sub1) > -1 && this.string.indexOf(sub2) > -1) {
								            this.getAllResults(sub1,sub2);
								        }
								        else return;
								    },
								    get:function (string,sub1,sub2) {
								        this.results = [];
								        this.string = string;
								        this.getAllResults(sub1,sub2);
								        return this.results;
								    }
								};
								var str = await getCurrentFields();
								var result = getFromBetween.get(str,"|",":");
								favorites = [{}];
								var numv = 0;
								result.forEach(async function(childResult) {										      	
							      	var vfield = '"' + childResult + '"';
							      	var vfieldValues = await getCurrentValues(vfield);
							      	
							      	item = {}
							        item [childResult] = vfieldValues;									        

							        
							        var myObj = {
									    [vfield] : vfieldValues											    
									};
									
									favorites.push( myObj );
									
							  	});
							  	
							  	var theFocus = document.getElementById("TypeComment");
								theFocus.focus();
							}
					
							vSend.onclick = async function() {
								var theDivM = document.getElementById("TypeComment").value;
								var like = '';
								if(theDivM.length > 0){
									milliseconds = new Date().toLocaleString();										
									var vpublic = privacy;
									var vusers = receiv;
									comments = await writeNewComment(milliseconds, currentUser, theDivM, like, vpublic, vusers);
									var theSel = document.getElementById("currentSel");						
									theSel.innerHTML = '';
									document.getElementById("TypeComment").value = '';
									//currentSelections = '';
								}
							}
							
							$("#TypeComment").on('keyup', async function (e) {								
    						 if (e.keyCode == 13) {								
								var theDivM = document.getElementById("TypeComment").value;
								var like = '';
								if(theDivM.length > 0){
									milliseconds = new Date().toLocaleString();											
									var vpublic = privacy;
									var vusers = receiv;
									comments = await writeNewComment(milliseconds, currentUser, theDivM, like, vpublic, vusers);
									var theSel = document.getElementById("currentSel");						
									theSel.innerHTML = '';
									document.getElementById("TypeComment").value = '';									
								}
							 }
							})
							/*$("#TypeComment").on('click', async function (e) {
								alert('Hola');
							})*/

							async function writeNewComment(time, user, comment, like, public, receivers) {											
								var theSelReply = document.getElementById("replyDiv");										
								var theSelReplyName = false;										

								ref = await writeref(null);										
								var vcode = ref.writeRef.substr(ref.writeRef.lastIndexOf("/") + 1);																					
								
								if(theSelReply){
									theSelReplyName = theSelReply.getAttribute("name");
									$( '.replyDiv' ).remove();
								}
								
								firebase.database().ref(ref.writeRef).set({
									time: time,
									user: user,
									comment: comment,
									like: like,
									public: public,
									currentSel: currentSelections,
									fieldSel: favorites,
									group: groupName,
									receivers: receivers,
									parent: theSelReplyName
								}, function (error) {
									if (error) {
									}
									else {

										var vLocked = '';
										var vpubcol = '';
										var vpubtxt = '';
										var vpublike = comment;										

								      	if(like == '-##like2##-'){
								      		vpublike = '<p><img id = "like" class = "icons" src="/Extensions/LetsComment/icons/like2.png" style = "width:50px"></p>'; 
								      	}
								      	if (public == 'unlocked'){
								      		vpubcol = 'LetsComment-bullet-green-r';
								      		vprivatxt = 'public';											      		
								      	}else{
								      		if(public == 'locked'){
								      			vpubcol = 'LetsComment-bullet-yellow-r';
								      			vprivatxt = 'private';
								      		}else{
								      			vpubcol = "LetsComment-bullet-pink-r";
								      			if(groupName.length > 0){
								      				vprivatxt = groupName;
								      			}else{
								      				vprivatxt = receivers;
								      			}
								      		}											      		
								      	}
								      	vpubtxt = '<p><i style = "color:DarkGray">' + vprivatxt + ' : </i><i>' + vpublike + '</i></p>';
									    										      	
								      	favorites = [{}];
								      	var replyText = '';
								      	if(theSelReplyName){
								      		replyText = '<p><i style = "font-size:14px">"' + theSelReplyName + '"</i></p>';
								      	}
										$("#box_" + currentObjectId).append(
								      		'<div id = "div_' + vcode + '" class = "LetsComment-bullet ' + vpubcol + '">' +
								      		'<div style = "float:right">' +
												'<img id = "' + vcode + '" class = "del" src="/Extensions/LetsComment/icons/del.png">' +							
											'</div>' +
											replyText +
								      		'<p><strong>' + user + '</strong><span style ="font-size:12px"> ' + time + '</span><i>' + vLocked + '</i></p>' +
								      		'<p id = "sel_' + vcode + '" class = "newLinkSel">' + currentSelections + '</p>' +
								      		vpubtxt +
								      		'</div>'								      		
										);										
										currentSelections = '';
										var theSel = document.getElementById("currentSel");						
										theSel.innerHTML = '';
										var objBox = document.getElementById("box_" + currentObjectId);
										objBox.scrollTop = objBox.scrollHeight;
										$('.del').click(function() {	
											if(vcode){
												delref = {
													"delRef": appId + '/' + currentObjectId	+ '/' + vcode
												}
												firebase.database().ref(delref.delRef).remove();
												$("#div_" + vcode).remove();													
											}
										})
										$('.newLinkSel').click(async function() {
											
											if(vcode){
												app.clearAll();
												readref = {
													"readRef": appId + '/' + currentObjectId	+ '/' + vcode
												}
												
												var query = firebase.database().ref(readref.readRef);
												query.once("value")
							  					.then(function(snapshot) {
							  						snapshot.child("fieldSel").forEach(function(selection){
							  							var valor = selection.node_.children_.root_.value.value_;
							  							var campo = selection.node_.children_.root_.key;
							  							var matchStr = "=[" + campo + "] = '" + valor.split(',').join("' or [" + campo + "] = '") + "'";
							  												    	
													    app.field(campo).selectMatch(matchStr)
							  							app.field(campo).selectPossible()	
													    
							  						})
							  					})							  					
											}
										})	
										currentSelections = '';
									}
								});
								var theFocus = document.getElementById("TypeComment");
								theFocus.focus();
							}
																
							async function selOneComment(readref) {																		
								
								var query = firebase.database().ref(readref.readRef).orderByKey();
								
								query.once("value")
								  .then(function(snapshot) {
								    snapshot.forEach(function(childSnapshot) {										      	
								      	var key = childSnapshot.key;										      	
								  	});										    
								});										
							}	
							async function readAllGroups() {								
								currentGroups = [];	
								currentGroupsReceiv = [];
								currentGroupsOwners = [];
								groupref = {
									"groupRef": 'UserGroups' + '/' + appId
								}
								
								var query = firebase.database().ref(groupref.groupRef).orderByKey();
								query.once("value")
								  .then(function(snapshot) {
								    snapshot.forEach(function(childSnapshot) {	
								    	currentGroups.push(childSnapshot.key);
								      	currentGroupsReceiv.push(childSnapshot.val().members);
								      	currentGroupsOwners.push(childSnapshot.val().owner);
								    })
								})
							}
							
							async function readAllComments() {			
								commentsArray = [];										
								readref = {
									"readRef": appId + '/' + currentObjectId									
								}
								
								var query = firebase.database().ref(readref.readRef).orderByKey();
								query.once("value")
								  .then(function(snapshot) {
								    snapshot.forEach(function(childSnapshot) {										      	
								      	var key = childSnapshot.key;
								      	var vcodedel = '';		
								      	var replyName = '';
								      	var vreply = '';
								      	var vReplyRec = '';
								      	var vReplyGroup = '';
								      	if(childSnapshot.val().public == 'unlocked'){
								      		vReplyGroup = 'public';
								      	}else{
								      		if(childSnapshot.val().public == 'group'){
								      			if(childSnapshot.val().group && childSnapshot.val().group > ''){
								      				vReplyGroup = childSnapshot.val().group;
								      			}else{
								      				vReplyGroup = childSnapshot.val().receivers;
								      			}
								      			vReplyRec = childSnapshot.val().receivers;
								      		}else{
								      			vReplyGroup = 'private';
								      		}
								      	}
								      	if(childSnapshot.val().like != '-##like2##-'){
								      		replyName = childSnapshot.val().user + ' - ' + vReplyGroup + ': ' + childSnapshot.val().comment.substring(0,20) + '..';
								      	 	vreply = '<div style = "padding-left:0px">' +
												'<img id = "' + key + '" class = "reply" title = "' + vReplyRec + '" name = "' + replyName + '" src="/Extensions/LetsComment/icons/reply.png">' +
											'</div>';
										}    											      		
								      	 
								      	var receiverMatch = false;
							      		if(childSnapshot.val().public == 'group'){
							      			var receiverLength = childSnapshot.val().receivers;
							      			var s = receiverLength;
										    var match = s.split(',')												    
										    for (var a in match)
										    {
										        if(onlyUser == match[a]){
										        	receiverMatch = true;
										        }
										    }									      			
							      		}
								      	var l1 = '';			
								      							      	
								      	if (currentUser == childSnapshot.val().user){
								      		vcodedel = '<div style = "float:right">' +
												'<img id = "' + key + '" name = "' + replyName + '" class = "del" src="/Extensions/LetsComment/icons/del.png">' +							
											'</div>';
								      		if (childSnapshot.val().public == 'unlocked'){										      			
								      			l1 = 'LetsComment-bullet-green-r';	
								      									      			
								      		}else{
								      			if(childSnapshot.val().public == 'locked'){
								      				l1 = 'LetsComment-bullet-yellow-r';
								      				
								      			}else{
								      				l1 = 'LetsComment-bullet-pink-r';
								      				
								      			}
								      		}
								      	}else{										      		
								      		if (childSnapshot.val().public == 'unlocked'){
								      			l1 = 'LetsComment-bullet-blue-l';	
								      											      			
								      		}else{
								      			if(receiverMatch){										      				
								      				l1 = 'LetsComment-bullet-pink-l';
								      				
								      			}
								      		}
								      	}
								      	var vLocked = '';
								      	var vpubtxt = '';										      	
								      	var vprivatxt = '';
								      	var vpublike = childSnapshot.val().comment;

								      	if(childSnapshot.val().like == '-##like2##-'){
								      		vpublike = '<p><img id = "like" class = "icons" src="/Extensions/LetsComment/icons/like2.png" style = "width:50px"></p>'; 
								      	}
								      	if (childSnapshot.val().public == 'unlocked'){	
								      		vprivatxt = 'public';										      												      		
								      	}else{											      		
								      		if (childSnapshot.val().public == 'locked'){
								      			vprivatxt = 'private';											      			
								      		}else{
								      			if(childSnapshot.val().group && childSnapshot.val().group > ''){
								      				vprivatxt = childSnapshot.val().group;
								      			}else{
								      				vprivatxt = childSnapshot.val().receivers;
								      			}
								      		}											      		
								      	}
								      	vpubtxt = '<p><i style = "color:DarkGray">' + vprivatxt + ' : </i><i>' + vpublike + '</i></p>';
									    
									    var replyText = '';
								      	if(childSnapshot.val().parent){
								      		replyText = '<p><i style = "font-size:14px">"' + childSnapshot.val().parent + '"</i></p>';
								      	}
								      	if (childSnapshot.val().user == currentUser || childSnapshot.val().public =='unlocked' || (childSnapshot.val().public == 'group' && receiverMatch)){ 
									      	$("#box_" + currentObjectId).append(											      		
									      		'<div id = "div_' + key + '" class = "LetsComment-bullet ' + l1 + '">' +
									      		vcodedel + vreply +
									      		replyText +
									      		'<p><strong>' + childSnapshot.val().user + '</strong><span style ="font-size:12px"> ' + childSnapshot.val().time + '</span><i>' + vLocked + '</i></p>' +
									      		'<p id = "sel_' + key + '" class = "linkSel">' + childSnapshot.val().currentSel + '</p>' +
									      		vpubtxt +
									      		'</div>'
									      		//'<br>'
											);										      											      	
									    }
								  	});
									var theFocus = document.getElementById("TypeComment");
									theFocus.focus();
								    var objBox = document.getElementById("box_" + currentObjectId);
								    objBox.scrollTop = objBox.scrollHeight;
									$('.del').click(function() {	
										if(this.id){
											delref = {
												"delRef": appId + '/' + currentObjectId	+ '/' + this.id
											}
											firebase.database().ref(delref.delRef).remove();
											$("#div_" + this.id).remove();													
										}
										var theFocus = document.getElementById("TypeComment");
										theFocus.focus();
									})
									$('.reply').click(function() {
										var thisid = this.id;
										var replyCommentBut = document.getElementById(thisid);
										var replyComment = replyCommentBut.name;											
										var replyReceiv = replyCommentBut.title;
										var replyCommentUser = replyComment.substring(0,replyComment.indexOf(' - '));
										var replyCommentRest = replyComment.substring(replyComment.indexOf(' - ') + 3);
										var replyCommentSentTo = replyCommentRest.substring(0,replyCommentRest.indexOf(':'));
										var privacyOld = privacy;
										switch (replyCommentSentTo){
											case "private":
												privacy = 'locked';
												groupName = '';
												receiv = '';
												break;
											case "public":
												privacy = 'unlocked';
												groupName = '';
												receiv = '';
												break;
											default :
												privacy = 'group';
												if(replyReceiv != replyCommentSentTo){
													groupName = replyCommentSentTo;																										
												}
												receiv = replyReceiv;
												break;													
										}
										
										var vOldLockBut = document.getElementById(privacyOld);
										vOldLockBut.src = globalPath + '/Extensions/LetsComment/icons/' + privacy + '.png';
										vOldLockBut.id = privacy;

										$( '.replyDiv' ).remove();
										if(thisid){
											replyref = {
												"repRef": appId + '/' + currentObjectId	+ '/' + thisid
											}
											var vReplyDiv = '<div id = "replyDiv" name = "' + replyComment + '" class = "replyDiv">' + 
												'<i><strong>"' + replyCommentUser + ' - </strong>' + replyCommentRest + '"</i>' + 
												'<button id = "escReply" type="button" style="width: 18px;position:relative;background:transparent;border:none;float:right;cursor:pointer">x</button>' +
												'</div>';
											$(".LetsComment-modal-body").append( vReplyDiv );
											
											var vEscReply   = document.getElementById("escReply");																								
											vEscReply.onclick = async function() {
												$( '.replyDiv' ).remove();
											}
										}
										var theFocus = document.getElementById("TypeComment");
										theFocus.focus();
									})
									$('.linkSel').click(async function() {

										if(this.id.substring(4) && this.innerHTML.length>1){
											app.clearAll();
											readref = {
												"readRef": appId + '/' + currentObjectId	+ '/' + this.id.substring(4)
											}
											var query = firebase.database().ref(readref.readRef);
											query.once("value")
						  					.then(function(snapshot) {
						  						snapshot.child("fieldSel").forEach(function(selection){
						  							var valor = selection.node_.children_.root_.value.value_;
						  							var campo = selection.node_.children_.root_.key;						  							
						  							var matchStr = "=[" + campo + "] = '" + valor.split(',').join("' or [" + campo + "] = '") + "'";
									
											    	app.field(campo).selectMatch(matchStr)
						  							app.field(campo).selectPossible()
						  						})
						  					})													
										}
									})
								});										
							}
							function getCurrentSelections() {										
								currentSelections = '';
								return new Promise(function (resolve, reject) {
									app.createGenericObject({
										currentSelections: {
											qStringExpression: "=GetCurrentSelections()"
										}
									}, function (reply) {
										
										currentSelections = reply.currentSelections
										resolve(currentSelections);
									});
								});
							}
							
							function getCurrentValues(childResult) {										
								
								return new Promise(function (resolve, reject) {
																				
									app.createGenericObject({
										currentValues: {
											qStringExpression: "=Concat(DISTINCT If(IsNull(" + childResult + "), '**'," + childResult + "), ','," + childResult + ")"
										}
									}, function (reply) {
										
										currentValues = reply.currentValues
										resolve(currentValues);
									});
									
								});
							}																			      										      										      	
							  	
							function getCurrentFields() {										
								
								return new Promise(function (resolve, reject) {
									app.createGenericObject({
										currentFields: {
											qStringExpression: "=GetCurrentSelections('|')"
										}
									}, function (reply) {
										
										currentFields = '|' + reply.currentFields
										resolve(currentFields);
									});
								});
							}

							
							async function writeref(id) {

								var ref = '';
								// Create current time field
								var time = await (new Date).getTime();
								var today = new Date();
								var dd = today.getDate();
								var mm = today.getMonth()+1; //January is 0!
								var yyyy = today.getFullYear();

								if(dd<10) {
								    dd = '0'+dd
								} 

								if(mm<10) {
								    mm = '0'+mm
								} 
								
								today = yyyy + '-' + mm + '-' + dd + '-' + time;																												
																	
								ref = {
									"writeRef": appId + '/' + currentObjectId + '/' + today											
								}																			
								return ref;
							}
						});								
					});						
				};
			}
		}

		return {
			initialProperties: {
				version: 1.0,
				showTitles: false
			}, 			
			paint: async function ( $element ) {				
				if($("#butLightBulb").length == 0){
					if (parseInt(version) <= 122447){
						$(".qui-buttonset-right").prepend($("<button id = 'butLightBulb' class='lui-button lui-button--toolbar iconToTheRight npsod-bar-btn lui-icon lui-icon--lightbulb'><span data-icon='toolbar-print'></span></button>"));
					}else{
						$(".qs-toolbar__right").prepend($("<button id = 'butLightBulb' class='lui-button qs-toolbar__element iconToTheRight npsod-bar-btn lui-icon lui-icon--lightbulb'><span data-icon='toolbar-print'></span></button>"));
					}
				}
				if(!document.getElementById('flagId')){					
					toggleId();
				}			
				
				$( ".lui-icon--lightbulb" ).on( "click", toggleId );

			}
		};
	} );
