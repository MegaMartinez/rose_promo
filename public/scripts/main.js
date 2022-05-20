/**
 * @fileoverview
 * Provides the JavaScript interactions for all pages.
 *
 * @author 
 * Matthew Martinez & Seokhyun Chang
 */

var rhit = rhit || {};

var queryMachine = null;
var authentication = null;
var currentPage = null;

rhit.currentUser = null;

rhit._user = null;

// CLASS STORAGE FOR POSTS & REPLIES

rhit.post = class{
	constructor(id, title, author, content, likes, replies, views, timestamp, tags) {
		this.id = id;
		this.title = title;
		this.author = author;
		this.content = content;
		this.likes = likes;
		this.replies = replies;
		this.views = views;
		this.timestamp = timestamp;
		this.tags = tags;
	}
}

rhit.reply = class{
	constructor(subpost, author, content, timestamp) {
		this.subpost = subpost;
		this.author = author;
		this.content = content;
		this.timestamp = timestamp;
	}
}

rhit.currentUserTemp = class {
	constructor(uid, email, name, viewed, liked, bookmarked){
		this.uid = uid;
		this.email = email;
		this.name = name;
		this.viewed = viewed;
		this.liked = liked;
		this.bookmarked = bookmarked;

		if(window.location.href.includes("detailPostPage.html")){
			currentPage.addView();
			currentPage.updateView();
		}

		if(window.location.href.includes("SigninPage.html")){
			window.location.href = "/";
		}

		if(window.location.href.includes("bookmarkPage.html")){
			currentPage.listBookMarks(this.bookmarked);
		}

		document.querySelector("#signInNavItem").innerHTML = "Sign-Out";
		document.querySelector("#signInNavItem").href = "/";
		document.querySelector("#signInNavItem").addEventListener("click", (event) => {
			authentication.signOut();
		});

		document.querySelector("#recNav").style.display = "block";
		document.querySelector("#bookNav").style.display = "block";
		if(document.querySelector("#fab")){
			document.querySelector("#fab").style.display = "block";
		}
	}
}

// QUERY MACHINE

rhit.QueryMachine = class {
	constructor() {
		this.posts = firebase.firestore().collection("posts");
		this.replies = firebase.firestore().collection("replies");
		this.userData = firebase.firestore().collection("userData");
	}

	addUserData(rfUser) {
		var docCount = 0;
		this.userData.where("uid", "==", rfUser.username).get().then((docs) => {
			docs.forEach((doc) => {
				docCount++;
			})
		}).then(() => {
			if(docCount == 0){
				this.userData.add({
					"uid": rfUser.username,
					"email": rfUser.email,
					"name": rfUser.name,
					"bookmarks": [],
					"liked": [],
					"viewed": []
				}).then(() => {
					this.userData.where("uid", "==", rfUser.username).get().then((docs) => {
						docs.forEach((doc) => {
							if(doc.exists){
								rhit.currentUser = new rhit.currentUserTemp(doc.data().uid, doc.data().email, doc.data().name, doc.data().viewed, doc.data().liked, doc.data().bookmarks);
							}
						})
					});
				});
			}
		});
	}

	getUserData(uid) {
		this.userData.where("uid", "==", uid).get().then((docs) => {
			docs.forEach((doc) => {
				if(doc.exists){
					rhit.currentUser = new rhit.currentUserTemp(doc.data().uid, doc.data().email, doc.data().name, doc.data().viewed, doc.data().liked, doc.data().bookmarks);
				}
			})
		});
	}

	addView(postId) {
		this.getPost(postId).then((post) => {
			post.views++;
			this.posts.doc(postId).update({
				"views": post.views
			});
			if(rhit.currentUser && !rhit.currentUser.viewed.includes(postId)){
				this.userData.where("uid", "==", rhit.currentUser.uid).get().then((docs) => {
					docs.forEach((doc) => {
						var viewed = rhit.currentUser.viewed;
						viewed.push(postId);
						this.userData.doc(doc.id).update({
							"viewed": viewed
						});
					})
				});
			}
		});
	}

	addLike(postId) {

		if(rhit.currentUser.liked.includes(postId)){
			return;
		}

		this.getPost(postId).then((post) => {
			post.likes++;
			this.posts.doc(postId).update({
				"likes": post.likes
			});
			if(rhit.currentUser){
				this.userData.where("uid", "==", rhit.currentUser.uid).get().then((docs) => {
					docs.forEach((doc) => {

						var liked = rhit.currentUser.liked;
						liked.push(postId);

						this.userData.doc(doc.id).update({
							"liked": liked
						});
					})
				});
			}
		});
	}

	addBookMark(postId) {

		if(rhit.currentUser.bookmarked.includes(postId)){
			return;
		}

		if(rhit.currentUser){
			this.userData.where("uid", "==", rhit.currentUser.uid).get().then((docs) => {
				docs.forEach((doc) => {

					var bookmarked = rhit.currentUser.bookmarked;
					bookmarked.push(postId);

					this.userData.doc(doc.id).update({
						"bookmarked": bookmarked
					});
				})
			});
		}
	}

	addPost(post) {
		this.posts.add({
			"title": post.title,
			"author": post.author,
			"content": post.content,
			"likes": post.likes,
			"replies": post.replies,
			"views": post.views,
			"timestamp": post.timestamp,
			"tags": post.tags
		}).then((doc) => {
			window.location.href = `/detailPostPage.html?id=${doc.id}`;
		});
	}

	editPost(post) {
		this.posts.doc(post.id).update({
			"title": post.title,
			"author": post.author,
			"content": post.content,
			"likes": post.likes,
			"replies": post.replies,
			"views": post.views,
			"timestamp": post.timestamp,
			"tags": post.tags
		}).then((doc) => {
			window.location.href = `/detailPostPage.html?id=${post.id}`
		})
	}

	deletePost(post) {
		this.posts.doc(post).delete().then(() => {
			window.location.href = "/";
		})
	}

	addReply(reply) {
		this.replies.add({
			"subpost": reply.subpost,
			"author": reply.author,
			"content": reply.content,
			"timestamp": reply.timestamp
		});
	}

	getPost(postId) {
		return this.posts.doc(postId).get().then((doc) => {
			if(doc.exists){
				return new rhit.post(postId, doc.data().title, doc.data().author, doc.data().content, doc.data().likes, doc.data().replies, doc.data().views, doc.data().timestamp.toDate(), doc.data().tags);
			} else {
				return false;
			}
		});
	}

	getReplies(postId) {
		return this.replies.where("subpost", "==", postId).orderBy("timestamp", "desc").get().then((docResults) => {
			var replies = [];
			docResults.forEach((doc) => {
				replies.push(new rhit.reply(doc.data().subpost, doc.data().author, doc.data().content, doc.data().timestamp.toDate()));
			});
			return replies;
		});
	}

	queryAllPosts(instructions) {
		if(instructions[0] != "views" && instructions[0] != "likes" && instructions[0] != "timestamp"){
			console.log("invalid instructions");
			return null;
		}

		if(instructions[1] != "desc" && instructions[1] != "asc"){
			console.log("invalid instructions");
			return null;
		}

		return this.posts.orderBy(instructions[0], instructions[1]).limit(50).get().then((docResults) => {
			var posts = [];
			docResults.forEach((doc) => {
				posts.push(new rhit.post(doc.id, doc.data().title, doc.data().author, doc.data().content, doc.data().likes, doc.data().replies, doc.data().views, doc.data().timestamp.toDate(), doc.data().tags));
			});
			return posts;
		});
	}

	querySearchResults(tags, instructions) {
		if(instructions[0] != "views" && instructions[0] != "likes" && instructions[0] != "timestamp"){
			console.log("invalid instructions");
			return null;
		}

		if(instructions[1] != "desc" && instructions[1] != "asc"){
			console.log("invalid instructions");
			return null;
		}

		let query = this.posts;

		tags.forEach((tag) => {
			query = query.where("tags", "array-contains", tag);
		})

		return query.orderBy(instructions[0], instructions[1]).limit(50).get().then((docResults) => {
			var posts = [];
			docResults.forEach((doc) => {
				posts.push(new rhit.post(doc.id, doc.data().title, doc.data().author, doc.data().content, doc.data().likes, doc.data().replies, doc.data().views, doc.data().timestamp.toDate(), doc.data().tags));
			});
			return posts;
		});
	}

}

// HTML CARD CREATION FUNCTIONS

function createPreviewCard(post) {
	var template = document.createElement("template");
	var tagshtml = ``;
	for(let i = 0; i < post.tags.length; i++){
		tagshtml += `<a href="searchPage.html?id=${post.tags[i]}" tabindex="0">#${post.tags[i]}</a>`;
	}
	var html = 
	`<div class="col-lg-6 col-sm-12">
		<a href="/detailPostPage.html?id=${post.id}">
			<div class="card">
				<div class="card-body">
					<h5 class="card-title">${post.title}</h5>
					<p class="card-text display-inline-block"><small class="text-muted">${post.author} / ${post.timestamp} / ${post.views} views / ${post.likes} likes
						</small></p>
					<p class="card-text tag"><small class="text-muted">
						${tagshtml}
					</small></p>
					<p class="card-text postpreview-text">${post.content}</p>
				</div>
			</div>
		</a>
	</div>`
	;	
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

function createFullCard(post) {
	var template = document.createElement("template");
	var tagshtml = ``;
	for(let i = 0; i < post.tags.length; i++){
		tagshtml += `<a href="searchPage.html?id=${post.tags[i]}" tabindex="0">#${post.tags[i]}</a>`;
	}

	//need to add user info. format is "User / time stap goes here/ views goes here / likes goes here,"
	var html = 
	`<div class="card">
		<div class="card-body"> 
			<h5 class="card-title display-inline-block">${post.title}</h5> 
			<button id="bookmarkButton" type="button" style="float:right; display: none;"  class="btn btn-default btn-sm .display-inline-block">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bookmark" viewBox="0 0 16 16">
					<path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
				</svg>
			</button>
			<button id="likeButton" type="button" style="float:right; display: none;"  class="btn btn-default btn-sm .display-inline-block">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-hand-thumbs-up" viewBox="0 0 16 16">
					<path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41C2.685 7.288 2 7.87 2 8.72v4.001c0 .845.682 1.464 1.448 1.545 1.07.114 1.564.415 2.068.723l.048.03c.272.165.578.348.97.484.397.136.861.217 1.466.217h3.5c.937 0 1.599-.477 1.934-1.064a1.86 1.86 0 0 0 .254-.912c0-.152-.023-.312-.077-.464.201-.263.38-.578.488-.901.11-.33.172-.762.004-1.149.069-.13.12-.269.159-.403.077-.27.113-.568.113-.857 0-.288-.036-.585-.113-.856a2.144 2.144 0 0 0-.138-.362 1.9 1.9 0 0 0 .234-1.734c-.206-.592-.682-1.1-1.2-1.272-.847-.282-1.803-.276-2.516-.211a9.84 9.84 0 0 0-.443.05 9.365 9.365 0 0 0-.062-4.509A1.38 1.38 0 0 0 9.125.111L8.864.046zM11.5 14.721H8c-.51 0-.863-.069-1.14-.164-.281-.097-.506-.228-.776-.393l-.04-.024c-.555-.339-1.198-.731-2.49-.868-.333-.036-.554-.29-.554-.55V8.72c0-.254.226-.543.62-.65 1.095-.3 1.977-.996 2.614-1.708.635-.71 1.064-1.475 1.238-1.978.243-.7.407-1.768.482-2.85.025-.362.36-.594.667-.518l.262.066c.16.04.258.143.288.255a8.34 8.34 0 0 1-.145 4.725.5.5 0 0 0 .595.644l.003-.001.014-.003.058-.014a8.908 8.908 0 0 1 1.036-.157c.663-.06 1.457-.054 2.11.164.175.058.45.3.57.65.107.308.087.67-.266 1.022l-.353.353.353.354c.043.043.105.141.154.315.048.167.075.37.075.581 0 .212-.027.414-.075.582-.05.174-.111.272-.154.315l-.353.353.353.354c.047.047.109.177.005.488a2.224 2.224 0 0 1-.505.805l-.353.353.353.354c.006.005.041.05.041.17a.866.866 0 0 1-.121.416c-.165.288-.503.56-1.066.56z"/>
				</svg>
			</button>
			<p class="card-text"><small class="text-muted">${post.author} / ${post.timestamp} / ${post.views} Views / ${post.likes} Likes
			</small></p>

			<!-- put link to "link for tagged posts goes here" -->
			<p class="card-text"><small class="text-muted">
				${tagshtml}
			</small></p>
		
			<br>
			<p class="card-text">${post.content}</p>
		</div>
  	</div>`
	;
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

function createReplyCard(reply) {
	var template = document.createElement("template");
	var html = 
	`<div class="card">
		<div class="card-body">
			<h6 class="card-text" style="margin-bottom: 4px;">${reply.author}</h6>
			<a class="card-text">${reply.content}</a>
			<p class="card-text"><small class="text-muted">${reply.timestamp}</small></p>
		</div>
	</div>`
	;
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

// AUTHENTICATOR

rhit.Authentication = class {
	constructor() {
		this._user = null;
	}

	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged(function(user) {
			console.log("user: ", user);
			this._user = user;
			rhit._user = user;
			queryMachine.getUserData(user.uid);
			changeListener();
		});
	}

	signIn() {
		Rosefire.signIn("6858f03f-3829-4ba1-9773-a3d365cb43f7", (err, rfUser) => {
			if (err) {
				console.log("Rosefire error!", err);
				return;
			}
			console.log("Rosefire success!", rfUser);
			queryMachine.addUserData(rfUser);
			firebase.auth().signInWithCustomToken(rfUser.token).catch(function(error) {
				const errorCode = error.code;
				const errorMessage = error.message;
				if(error === 'auth/invalid-custom-token'){
					alert('The token you provided is not valid');
				} else {
					console.log("login fail\n", errorCode, errorMessage);
				}
			});
 		});
	}

	signOut() {
		firebase.auth().signOut().then(() => {
			window.location.href = "/";
		});
	}

	get isSignedIn() {
		return !!this._user;
	}

	get uid() {
		if(this._user){
			return this._user.uid;
		} else {
			return null;
		}
	}
}

// DETAIL PAGE CLASS

rhit.detailPage = class {
	constructor(){
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		this.postId = urlParams.get("id");

		document.querySelector("#replySubmit").addEventListener("click", (event) => {
			if(document.querySelector("#replyTextArea").value.trim()){
				const reply = new rhit.reply(this.postId, rhit.currentUser.name, document.querySelector("#replyTextArea").value, firebase.firestore.Timestamp.now());
				queryMachine.addReply(reply);
				this.updateView();
			}
		});

		document.querySelector("#editButton").addEventListener("click", (event) => {
			window.location.href = `/addPost.html?id=${this.postId}`;
		});

		document.querySelector("#deleteButton").addEventListener("click", (event) => {
			queryMachine.deletePost(this.postId);
		});

		this.updateView();
	}

	addView() {
		queryMachine.addView(this.postId);
	}

	updateView() {

		queryMachine.getPost(this.postId).then((post) => {
			const mainPost = document.querySelector("#PostContents");
			while(mainPost.lastChild){
				mainPost.removeChild(mainPost.lastChild);
			}
			mainPost.appendChild(createFullCard(post));
			if(post.author == rhit.currentUser.name){
				document.querySelector("#dropdown").style.display = "block";
			}

			if(rhit.currentUser){
				document.querySelector("#replyBox").style.display = "block";

				document.querySelector("#bookmarkButton").style.display = "block";
				document.querySelector("#bookmarkButton").addEventListener("click", (event) => {
					queryMachine.addBookMark(this.postId);					
				});

				document.querySelector("#likeButton").style.display = "block";
				document.querySelector("#likeButton").addEventListener("click", (event) => {
					queryMachine.addLike(this.postId);
				});
			}

		});

		queryMachine.getReplies(this.postId).then((replies) => {
			if(replies.length == 0){
				return;
			}
			const replyList = document.querySelector("#replies");
			while(replyList.lastChild){
				replyList.removeChild(replyList.lastChild);
			}
			for(let i = 0; i < replies.length; i++){
				replyList.appendChild(createReplyCard(replies[i]));
			}
		})
	}
}


// ADD POST PAGE

rhit.addPostPage = class {
	constructor(){
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		this.postId = urlParams.get("id");
		this.author = null;

		var title = document.querySelector("#titleInput");
		var tags = document.querySelector("#tagInput");
		var content = document.querySelector("#contentInput");

		if(this.postId){
			queryMachine.getPost(this.postId).then((post) => {
				if(post){
					title.value = post.title;
					content.value = post.content;
					post.tags.forEach(tag => {
						tags.value += `#${tag} `;
					});
					this.author = post.author;
				}
			});
		}

		document.querySelector("#submitButton").addEventListener("click", (event) => {
			if(title.value.trim() && content.value.trim()){
				var newPost = new rhit.post(this.postId, title.value, rhit.currentUser.name, content.value, 0, 0, 0, firebase.firestore.Timestamp.now(), this.markTags(tags.value));
				
				if(this.postId != null){
					if(this.author == rhit.currentUser.name){
						queryMachine.editPost(newPost);
					} else {
						window.location.href = `/detailPostPage.html?id=${this.postId}`
					}
				} else {
					queryMachine.addPost(newPost);
				}
			}
		});

	}

	markTags(tagString){
		tagString = tagString.replace(/\s/g,"");

		if(!tagString.includes("#")){
			return [];
		}

		while(tagString.includes("##")){
			tagString = tagString.replace("##", "#");
		}

		while(tagString.endsWith("#")){
			tagString = tagString.substring(0, tagString.length - 1);
		}

		for(let i = 0; i < tagString.length; i++){
			if(tagString.charAt(i) == "#"){
				tagString = tagString.slice(i);
				break;
			}
		}

		var tags = tagString.split("#");

		for(let i = 0; i < tags.length; i++){
			if(tags[i] == ""){
				tags.splice(i, 1);
			}
		}

		return tags;
		
	}

}

// SEARCH RESULTS PAGE CLASS

rhit.searchPage = class {
	constructor() {
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		this.tagQuery = this.markTags(urlParams.get("id"));
		console.log(this.tagQuery);

		this.selectedSort = "newest";

		document.querySelector("#newestDropdown").addEventListener("click", (event) => {
			this.selectedSort = "newest";
			this.updateResults();
		});

		document.querySelector("#oldestDropdown").addEventListener("click", (event) => {
			this.selectedSort = "oldest";
			this.updateResults();
		});

		document.querySelector("#likesDropdown").addEventListener("click", (event) => {
			this.selectedSort = "likes";
			this.updateResults();
		});

		document.querySelector("#viewsDropdown").addEventListener("click", (event) => {
			this.selectedSort = "views";
			this.updateResults();
		});

		this.updateResults();
	}

	updateResults(){
		var instructions = [];
		switch(this.selectedSort){
			case "newest":
				instructions.push("timestamp");
				instructions.push("desc");
				break;
			case "oldest":
				instructions.push("timestamp");
				instructions.push("asc");
				break;
			case "likes":
				instructions.push("timestamp");
				instructions.push("asc");
				break;
			case "views":
				instructions.push("timestamp");
				instructions.push("asc");
				break;
			default:
				return;
		}

		queryMachine.querySearchResults(this.tagQuery, instructions).then((posts) => {
			while(document.querySelector("#indexResults").lastChild){
				document.querySelector("#indexResults").removeChild(document.querySelector("#indexResults").lastChild);
			}
			posts.forEach((post) => {
				document.querySelector("#indexResults").appendChild(createPreviewCard(post));
			})
		})
	}

	markTags(tagString){
		if(!tagString.includes("#")){
			return this.markTagsNoHash(tagString);
		}

		tagString = tagString.replace(/\s/g,"");

		while(tagString.includes("##")){
			tagString = tagString.replace("##", "#");
		}

		while(tagString.endsWith("#")){
			tagString = tagString.substring(0, tagString.length - 1);
		}

		for(let i = 0; i < tagString.length; i++){
			if(tagString.charAt(i) == "#"){
				tagString = tagString.slice(i);
				break;
			}
		}

		var tags = tagString.split("#");

		for(let i = 0; i < tags.length; i++){
			if(tags[i] == ""){
				tags.splice(i, 1);
			}
		}
		return tags;
	}

	markTagsNoHash(tagString){
		var tags = tagString.split(" ");
		for(let i = 0; i < tags.length; i++){
			if(tags[i] == ""){
				tags.splice(i, 1);
			}
		}
		return tags;
	}
}

// SIGNINPAGE CLASS

rhit.signinPage = class {
	constructor(){
		document.querySelector("#roseFireButton").addEventListener("click", (event) => {
			authentication.signIn();
		});
	}
}


// HOME PAGE CLASS

rhit.homePage = class {
	constructor(){
		if(!document.querySelector("#indexResults")){
			window.location.href = "/";
		}

		this.selectedSort = "newest";

		document.querySelector("#newestDropdown").addEventListener("click", (event) => {
			this.selectedSort = "newest";
			this.updateHome();
		});

		document.querySelector("#oldestDropdown").addEventListener("click", (event) => {
			this.selectedSort = "oldest";
			this.updateHome();
		});

		document.querySelector("#likesDropdown").addEventListener("click", (event) => {
			this.selectedSort = "likes";
			this.updateHome();
		});

		document.querySelector("#viewsDropdown").addEventListener("click", (event) => {
			this.selectedSort = "views";
			this.updateHome();
		});

		this.updateHome();

	}

	updateHome(){
		var instructions = [];
		switch(this.selectedSort){
			case "newest":
				instructions.push("timestamp");
				instructions.push("desc");
				break;
			case "oldest":
				instructions.push("timestamp");
				instructions.push("asc");
				break;
			case "likes":
				instructions.push("timestamp");
				instructions.push("asc");
				break;
			case "views":
				instructions.push("timestamp");
				instructions.push("asc");
				break;
			default:
				return;
		}

		queryMachine.queryAllPosts(instructions).then((posts) => {
			while(document.querySelector("#indexResults").lastChild){
				document.querySelector("#indexResults").removeChild(document.querySelector("#indexResults").lastChild);
			}
			posts.forEach((post) => {
				document.querySelector("#indexResults").appendChild(createPreviewCard(post));
			})
		})
	}
}

// RECOMMENDED PAGE CLASS

rhit.recommendationPage = class {

}

// BOOKMARK PAGE CLASS
// STILL NEED TO ADD DELETE BOOKMARK FUNCTION

rhit.bookmarkPage = class {
	constructor(){}
	listBookMarks(bookmarks){
		bookmarks.forEach((postId) => {
			queryMachine.getPost(postId).then((post) => {
				document.querySelector("#bookmarks").appendChild(createPreviewCard(post));
			});
		});
	}
}



// MAIN

rhit.main = function () {
	console.log("Ready");
	queryMachine = new rhit.QueryMachine();
	authentication = new rhit.Authentication();
	authentication.beginListening((_user) => {
		rhit._user = _user;
	});

	if(document.querySelector("#searchBtn")){
		document.querySelector("#searchBtn").addEventListener("click", (event) => {
			console.log("searchInputRead");
			// window.location.href = `/searchPage.html?id=${document.querySelector("#searchBarInputText").value}`
		})
	}
	
	if((window.location.href.includes("/#") || window.location.href == "/") && false){
		currentPage = new rhit.homePage();
	} else if(window.location.href.includes("addPost.html")){
		currentPage = new rhit.addPostPage();
	} else if(window.location.href.includes("detailPostPage.html")){
		currentPage = new rhit.detailPage();
	} else if(window.location.href.includes("SigninPage.html")){
		currentPage = new rhit.signinPage();
	} else if(window.location.href.includes("bookmarkPage.html")){
		currentPage = new rhit.bookmarkPage();
	} else if(window.location.href.includes("recommendedPage.html")){
		currentPage = new rhit.recommendationPage();
	} else if(window.location.href.includes("searchPage.html")){
		currentPage = new rhit.searchPage();
	} else {
		currentPage = new rhit.homePage();
	}


};

rhit.main();
