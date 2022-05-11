/**
 * @fileoverview
 * Provides the JavaScript interactions for all pages.
 *
 * @author 
 * Matthew Martinez & Seokhyun Chang
 */

var rhit = rhit || {};

var queryMachine = null;

rhit.QueryMachine = class {
	constructor() {
		this.posts = firebase.firestore().collection("posts");
		this.replies = firebase.firestore().collection("replies");

		this.testQuery();
	}

	testQuery(){
		this.posts.where("author","==","").get()
		.then((querySnapshot) => {
			querySnapshot.forEach((doc) => {
				console.log(doc.id, " => ", doc.data());
			});
		});
		this.replies.where("author","==","").get()
		.then((querySnapshot) => {
			querySnapshot.forEach((doc) => {
				console.log(doc.id, " => ", doc.data());
			});
		});
	}
}


rhit.main = function () {
	console.log("Ready");
	queryMachine = new rhit.QueryMachine();
};

rhit.main();
