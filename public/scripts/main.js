/**
 * @fileoverview
 * Provides the JavaScript interactions for all pages.
 *
 * @author 
 * Matthew Martinez & Seokhyun Chang
 */

var rhit = rhit || {};

var queryMachine = null;

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

// QUERY MACHINE

rhit.QueryMachine = class {
	constructor() {
		this.posts = firebase.firestore().collection("posts");
		this.replies = firebase.firestore().collection("replies");
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
		});
	}

	deletePost(post) {
		this.posts.doc(post.id).delete();
	}

	addReply(reply) {
		this.replies.add({
			"subpost": reply.subpost,
			"author": reply.author,
			"content": reply.content,
			"timestamp": reply.timestamp
		});
	}

	deleteReply(reply) {
		console.log("TODO add delete reply function");
	}

	getPost(postId) {
		this.posts.where("id", "==", postId).get().then((doc) => {
			if(doc.exists){
				return new rhit.post(doc.id, doc.title, doc.author, doc.content, doc.likes, doc.replies, doc.views, doc.timestamp, doc.tags);
			}
		});
	}

	getReplies(postId) {
		this.replies.orderBy("timestamp", "desc").where("subpost", "==", postId).get().then((docResults) => {
			var replies = [];
			docResults.foreach((doc) => {
				replies.push(new rhit.reply(doc.subpost, doc.author, doc.content, doc.timestamp));
			});
			return replies;
		});
	}
}

// HTML CARD CREATION FUNCTIONS

function createPreviewCard(post) {
	var template = document.createElement("template");
	var html = 
	`<div class="col-lg-6 col-sm-12">
		<a href="detailPost/?id=${post.id}">
			<div class="card">
				<div class="card-body"> 
					<h5 class="card-title">${post.title}</h5>
					<p class="card-text">${post.content}</p>
					<p class="card-text"><small class="text-muted">${post.timestamp} / ${post.views} / ${post.likes}</small></p>
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
	var html = 
	`<div class="col-lg-6 col-sm-12">
		<a href="detailPost/?id=${post.id}">
			<div class="card">
				<div class="card-body"> 
					<h5 class="card-title">${post.title}</h5>
					${post.content}
					<p class="card-text"><small class="text-muted">${post.timestamp} / ${post.views} / ${post.likes}
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

// AUTHENTICATOR

rhit.Authentication = class {
	constructor() {
		this._user = null;
	}

	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged(function(user) {
			console.log("user: ", user);
			this._user = user;
			changeListener();
		});
	}

	signIn() {
		Rosefire.signIn("543265ba-ed69-42b8-829f-269eab220ee7", (err, rfUser) => {
			if (err) {
				console.log("Rosefire error!", err);
				return;
			}
			console.log("Rosefire success!", rfUser);
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
		firebase.auth().signOut().catch((error) => {
			console.log("error signing out: ", error);
		});
	}

	get isSignedIn() {
		console.log(this._user);
		return !!this._user;
	}

	get uid() {
		return this._user.uid;
	}
}

// DETAIL PAGE CLASS

rhit.detailPage = class {
	constructor(){
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		this.postId = urlParams.get("id");
	}
}

// HOME PAGE CLASS

rhit.homePage = class {

}



// MAIN

rhit.main = function () {
	console.log("Ready");
	queryMachine = new rhit.QueryMachine();



};

rhit.main();
