(function ($) {
	$.fn.mobilemenu = function(options) {

		var defaults = $.extend({
			},options);

		var obj = $(this);
		var wrapper = obj.closest('.wrapper');	//phần tử chứa toàn bộ trang
		var taskbar_m = obj.parents('.taskbar-m');

		var opts = $.extend(defaults,options);

		return this.each(function() {

			//Hiển thị menu mobile
			obj.click(function() {
				wrapper.toggleClass('wrapper-m');
			});

			//Hiển thị menu con của menu mobile
		    wrapper.find('.menu-m > ul > li > span').click(function() {
		    	$(this).parent().find('ul').toggle('medium');
		    });

		    //Hiển thị textbox search
		    taskbar_m.find('form button').click(function() {
		    	txt_prev = $(this).prev();
		    	if (txt_prev.width() === 0) {
		    		txt_prev.width(220);
		    		return false;
		    	}

		    	if (txt_prev.width() > 0) {
		    		if (!txt_prev.val())
		    		{
		    			txt_prev.width(0);
		    			return false;
		    		}
		    	}
		    });

		    //Ẩn menu mobile bằng cách click ra bên ngoài menu mobile
		    obj.closest('body').click(function(e) {

		    	//Nếu có class wrapper-m và phần tử đích không phải là btn-m
		    	if ( wrapper.hasClass('wrapper-m') && !($(e.target).hasClass('btn-m')) )
		    	{
			    	if ($(e.target).closest(".menu-m").length === 0) {
			    		wrapper.toggleClass('wrapper-m');
			    	}
		    	}
		    });

		});

	};
})(jQuery);