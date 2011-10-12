Popcorn.extend(Popcorn.p, {
  // jump the playhead #{time} seconds
  jump: function(time) {
    this.media.currentTime = Popcorn.util.toSeconds(this.media.currentTime) + Popcorn.util.toSeconds(time);
  },
});

Popcorn.extend(Popcorn.util, {
  // convert seconds into SMPTE style hh:mm:ss
  toSmpte: function(time, framerate) {
    var validTimeFormat = /^([0-9]+:){0,2}[0-9]+([.;][0-9]+)?$/;
  
    if (typeof time === "string" && validTimeFormat.test(time)) {
      return time;
    }

    if (typeof time === "string") {
      Popcorn.error("Invalid time format");
    }

    var t = new Array(0,0,0);

    t[2] = time;

    if(t[2] >= 60) {
      t[1] = parseInt(t[2] / 60);
      t[2] -= t[1] * 60;
    }

    if(t[1] >= 60) {
      t[0] = parseInt(t[1]/ 60);
      t[1] -= t[0] * 60;
    }

    if(t[0] < 10) { t[0] = "0" + t[0];}
    if(t[1] < 10) { t[1] = "0" + t[1];}
    if(t[2] < 10) { t[2] = "0" + t[2];}  

    return t.join(':');
  }
});
