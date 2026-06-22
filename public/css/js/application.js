var viv = function() {
	var that = $(window);
	var scroll_pos = that.scrollTop();
	var viw = $('.viw').not('.is_shown');
	viw.each(function(index, ele) {
		var desire_pos = scroll_pos + that.innerHeight()-100;
		var current_ele = $(ele);
		if(desire_pos >= current_ele.offset().top)
			current_ele.addClass('is_shown');
	});
}


$(function(){

	//Khởi tạo hiển thị
	$(window).on('load', viv);
	$(window).on('scroll', viv);

});