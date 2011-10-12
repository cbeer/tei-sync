MediaAlignment = function(media, text, options) {
  return new MediaAlignment.prototype.init(media, text, options || null);
}

MediaAlignment.prototype = {
  init: function(popcorn, file, options) {
            var self = this;
    this.options = options || {};
    this.pop = popcorn;
    this.transcript = MediaTeiTranscript($('#transcript'), file, { 
        ready: function() { self.setup(); }
    });

    this.id_to_in_out = {};
  },

  setup: function() {
    var self = this;

    this.pop.listen('timeupdate', function(evt) {
      t = evt.target.currentTime;

      $('.active').removeClass('active');

      $.each(self.id_to_in_out, function(key, val) {
        if(val[0] <= t && t < val[1]) {
          $("#" + key).addClass('active');
        }
      });
    });

    this.select($('tbody tr:first-child', this.transcript.element));

    $('tr', this.transcript.element).each(function() {
      var i_v =  $(this).find('.begin').val();
      var o_v =  $(this).find('.end').val() || o_v;
      i_v = i_v || o_v;

      if(i_v && o_v) {
        var i =  Popcorn.util.toSeconds(i_v);
        var o =  Popcorn.util.toSeconds(o_v);
        self.id_to_in_out[$(this).attr('id')] = [i,o];
      }
    });

    $('td', this.transcript.element).bind('click', function() {
      self.select($(this).closest('tr'));
    });
	
    $('td input', this.transcript.element).bind('focus', function() {
      self.select($(this).closest('tr'), { focus: false});
    });
  },
        
  markIn: function() {
    var val = this.currentTimeAsSmpte();
    this.current().find('.begin').val(val);
    this.id_to_in_out[this.current().attr('id')][0] = this.currentTime();
    this.transcript.xml.find('[xml\\:id="' + this.current().attr('id') + '"]').attr('smil:begin', val);
  },

  markOut: function(t) {
    var val = this.currentTimeAsSmpte();
    this.current().find('.end').val(val);
    this.id_to_in_out[this.current().attr('id')][1] = this.currentTime();
    this.transcript.xml.find('[xml\\:id="' + this.current().attr('id') + '"]').attr('smil:end', val);
  },

  preview: function() {
    this.pop.pause();
    var t =  Popcorn.util.toSeconds(this.current().find('.begin').val());
    if(t > 1) { t -= 1 };
    this.pop.currentTime(t);
    this.pop.play();
  },

  mark: function() {
    this.markOut();        
    this.next();
    this.markIn();
  },

  next: function() {
    this.select(this.current().next());
  },

  prev: function() {
    this.select(this.current().prev());
            },

  select: function(tr, options) {
    options = $.extend({focus: true}, options || {});          

    this.current().removeClass('current');

    tr.addClass('current');

    if(options.focus) {
      tr.find('.begin').focus();
    }

    this.transcript.element.scrollTo('.current',  100, {offset: {top: '-50px'}});
  },

  currentTime: function() {
    return this.pop.currentTime();
  },

  currentTimeAsSmpte: function() {
    return Popcorn.util.toSmpte(this.currentTime()).substr(0,12);
  },

  current: function() {
    return $('.current');
  }, 

  save: function() {
    return this.transcript.save();
  }
};

MediaAlignment.prototype.init.prototype = MediaAlignment.prototype;

MediaTeiTranscript = function(element, text, options) {
  return new MediaTeiTranscript.prototype.init(element, text, options || null);
};

MediaTeiTranscript.synchronizable_elements = 'seg,incident';


MediaTeiTranscript.prototype = {

  init: function(element, text, options) {
    this.element = element;
    this.options = $.extend({ready: function() {}}, options || {});          

    if(typeof text === "object") {
      this.load_file(text); 
    } else {
      this.load(text);
    }

    this.element_count = 0;
    this.people_id_to_name = [];
    this.synchronizable_elements = MediaTeiTranscript.synchronizable_elements;
  },


  load_file: function(file) {
    var reader = new FileReader();
    var self = this;

    reader.onloadend = function(evt) { 
      text = evt.target.result; 
      var parser = new DOMParser();
      var doc = parser.parseFromString(text, 'text/xml');

      self.load(doc);
    }

    reader.readAsText(file);
  },

  load: function(doc) {   
    this.xml = $(doc);
    this.assign_xml_ids_to_all_elements();
    var self = this;


    this.element.html('<table><thead><tr><th>In</th><th>Out</th><th>Text</th></thead><tbody></tbody></table>');
    var tbody = $('#transcript tbody');

    this.xml.find(this.synchronizable_elements).each(function() {
      tr = $('<tr></tr>');
      tr.attr('id', $(this).attr('xml:id'));
		
      tr.append('<td><input class="begin" type="text" value="' + ($(this).attr('smil:begin') || '') +'"/></td>');
      tr.append('<td><input class="end" type="text" value="' + ($(this).attr('smil:end') || '') +'"/></td>');

      body = $('<td></td>').appendTo(tr);
		
      who = $(this).closest('u').attr('who');
		
      if(who != undefined) {
      	body.append('<strong>' + self.people(who.substring(1)) + ':</strong>');
      } 
		
      body.append($(this)[0].textContent);
		
      tr.appendTo(tbody);
    });          
    self.options.ready();
  },

  save: function() {
    var serializer = new XMLSerializer();
    var xml = serializer.serializeToString(self.transcript[0]);
              
    var bb = new WebKitBlobBuilder();
    bb.append(xml);

    var blob = bb.getBlob('application/xml');
    return window.URL.createObjectURL(blob);
  },

  people: function(id) {
   var self = this;
    if (this.people_id_to_name.length == 0) {

      this.xml.find('person').each(function() {
        self.people_id_to_name[$(this).attr('xml:id')] = $.trim($(this).text());
      }); 
    }

    if(typeof id === "string") {
      return this.people_id_to_name[id]; 
    }

    return this.people_id_to_name;
  },

  assign_xml_ids_to_all_elements: function() {
    this.xml.find(this.synchronizable_elements).filter(function() { return !$(this).attr('xml:id'); }).each(function() { v = generate_id(this); $(this).attr('xml:id', v); });
  },                                    

  generate_id: function(el) {
    return '__' + el.nodeName + element_count++;
  }  
};

MediaTeiTranscript.prototype.init.prototype = MediaTeiTranscript.prototype;
