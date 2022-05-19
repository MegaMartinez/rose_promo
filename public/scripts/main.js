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
	constructor(uid, email, name){
		this.uid = uid;
		this.email = email;
		this.name = name;

		if(window.location.href.includes("detailPostPage.html")){
			currentPage.updateView();
		}

		document.querySelector("#signInNavItem").innerHTML = "Sign-Out";
		document.querySelector("#signInNavItem").addEventListener("click", (event) => {
			authentication.signOut();
		});

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
		this.userData.add({
			"uid": rfUser.username,
			"email": rfUser.email,
			"name": rfUser.name
		});
	}

	getUserData(uid) {
		this.userData.where("uid", "==", uid).get().then((docs) => {
			docs.forEach((doc) => {
				if(doc.exists){
					rhit.currentUser = new rhit.currentUserTemp(doc.data().uid, doc.data().email, doc.data().name);
				}
			})
		});
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
				return new rhit.post(doc.data().id, doc.data().title, doc.data().author, doc.data().content, doc.data().likes, doc.data().replies, doc.data().views, doc.data().timestamp.toDate(), doc.data().tags);
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
		<a href="detailPostPage.html?id=${post.id}">
			<div class="card">
				<div class="card-body"> 
					<h5 class="card-title">${post.title}</h5>
					<p class="card-text">${post.content}</p>
					<p class="card-text"><small class="text-muted">${post.timestamp} / ${post.views} / ${post.likes}</small></p>
					
					<p class="card-text"><small class="text-muted">
						${tagshtml}
                	</small></p>

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
	var html = 
	`<div class="card">
		<div class="card-body"> 
			<h5 class="card-title">${post.title}</h5>
			<p class="card-text"><small class="text-muted">${post.timestamp} / ${post.views} Views / ${post.likes} Likes
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

		if(rhit.currentUser){
			document.querySelector("#replyBox").style.display = "none";
		}

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

		console.log(tags);

		return tags;
		
	}

}

// SEARCH RESULTS PAGE CLASS

rhit.searchPage = class {

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

}



// MAIN

rhit.main = function () {
	console.log("Ready");
	queryMachine = new rhit.QueryMachine();
	authentication = new rhit.Authentication();
	authentication.beginListening((_user) => {
		rhit._user = _user;
	});
	
	if(false){

	} else if(window.location.href.includes("addPost.html")){
		currentPage = new rhit.addPostPage();
	} else if(window.location.href.includes("detailPostPage.html")){
		currentPage = new rhit.detailPage();
	} else if(window.location.href.includes("SigninPage.html")){
		currentPage = new rhit.signinPage();
	}


};

rhit.main();
