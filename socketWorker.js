var socketAddr = location.host.split(':')[0] + ':3000';
importScripts('//'+socketAddr+'/socket.io/socket.io.js'); 

var socket = io(socketAddr+'/snake');

socket.on('connect',function(){
	self.postMessage({action:'connect'});
});
socket.on('disconnect',function(){
	self.postMessage({action:'disconnect'});
});
socket.on('configure',function(info){
	self.postMessage({action:'configure',data:info});
});
socket.on('update',function(info){
	self.postMessage({action:'update',data:info});
});

self.addEventListener('message', function(e) {
	var msg = e.data;
	if(msg.action == 'join'){
		self.socket.emit('join');
	}else if(msg.action == 'move'){
		self.socket.emit('move',msg.data);
	}
}, false);