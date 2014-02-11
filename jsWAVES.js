/*    
@licstart  The following is the entire license notice for the 
JavaScript code in this page.


Copyright (c) 2014, Doug Lipinski, dmlipinski@gmail.com
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met: 

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies, 
either expressed or implied, of the FreeBSD Project.


@licend  The above is the entire license notice
for the JavaScript code in this page.
*/


/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*\
|                                                              |
|                       object definitions                     |
|                                                              |
\*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

//drops:
function Drop(freq) {
	this.freq=freq;

	this.DropNow=DropNow;
	function DropNow(state) {
		//determine whether or not to place a drop based on the desired frequency
		//and a max freq of about 10 drops per second (if 60fps is achieved)
		if (this.freq>600*Math.random())
		{
			//drop location:
			var i=Math.floor(Math.random()*state.nx);
			var j=Math.floor(Math.random()*state.ny);

			var expTerm1;
			var expTerm2;
			for (var jj=0; jj<state.ny; jj++)
			{
				for (var ii=0; ii<state.nx; ii++)
				{
					//Droplets make the surface approach this shape (2d Gaussian):
					expTerm1 = Math.exp( (-Math.pow(ii-i,2)-Math.pow(jj-j,2))*.25 );

					//Droplet influence decays at this rate (2d Gaussian):
					expTerm2 = Math.exp( (-Math.pow(((ii-i)),2)-Math.pow(((jj-j)),2))*.025 );

					state.eta.val[ii+state.nx*jj] += 25*(expTerm1-state.eta.val[ii+state.nx*jj])*state.dt*expTerm2;
					
				}
			}
		}
	}
}

//field object to hold state variables:
function Field(nx,ny) {
	this.nx = nx;
	this.ny = ny;
	this.val = new Float32Array(this.nx*this.ny);
	
	//functions to compute field derivatives:

	this.DX = DX;
	function DX()
	{
		//Compute the x derivative, 4th order accurate, one sided near boundaries
		//This function does not compute the derivative on the boundary points
		//  since those are assumed to be handled via the boundary condition.

		var DXvals = new Field(this.nx,this.ny);

		var index;
		//Interior points:
		for (var j=0; j<this.ny; j++)
		{
			for (var i=2; i<this.nx-2; i++)
			{
				index=i+this.nx*j;
				DXvals.val[index] = ( this.val[index-2]-8*this.val[index-1]+8*this.val[index+1]-this.val[index+2] )/12;
			}
		}

		//Points 1 from the boundary:
		var i=1;
		for (var j=0; j<this.ny; j++)
		{
			index=i+this.nx*j;
			DXvals.val[index] = ( -3*this.val[index-1]-10*this.val[index]+18*this.val[index+1]-6*this.val[index+2]+this.val[index+3] )/12;
		}
		var i=this.nx-2;
		for (var j=0; j<this.ny; j++)
		{
			index=i+this.nx*j;
			DXvals.val[index] = ( 3*this.val[index+1]+10*this.val[index]-18*this.val[index-1]+6*this.val[index-2]-this.val[index-3] )/12;
		}

		return DXvals;
		
	}

	this.DY = DY;
	function DY()
	{
		//Compute the y derivative, 4th order accurate, one sided near boundaries
		//This function does not compute the derivative on the boundary points

		var DYvals = new Field(this.nx,this.ny);

		var index;
		//Interior points:
		for (var j=2; j<this.ny-2; j++)
		{
			for (var i=0; i<this.nx; i++)
			{
				index=i+this.nx*j;
				DYvals.val[index] = ( this.val[index-2*this.nx]-8*this.val[index-this.nx]+8*this.val[index+this.nx]-this.val[index+2*this.nx] )/12;
			}
		}

		//Points 1 from the boundary:
		var j=1;
		for (var i=0; i<this.nx; i++)
		{
			index=i+this.nx*j;
			DYvals.val[index] = ( -3*this.val[index-this.nx]-10*this.val[index]+18*this.val[index+this.nx]-6*this.val[index+2*this.nx]+this.val[index+3*this.nx] )/12;
		}
		var j=this.ny-2;
		for (var i=0; i<this.nx; i++)
		{
			index=i+this.nx*j;
			DYvals.val[index] = ( 3*this.val[index+this.nx]+10*this.val[index]-18*this.val[index-this.nx]+6*this.val[index-2*this.nx]-this.val[index-3*this.nx] )/12;
		}

		return DYvals;
		
	}

	this.Draw = Draw;
	function Draw(canvas,ctx,lower,upper)
	{
		//Clear and resize the canvas
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		
		//reset the transformation:
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.scale(canvas.width/(this.nx-1),canvas.height/(this.ny-1));

		//image:
		var imgData=ctx.createImageData(this.nx,this.ny);

		//colormap (from c1 to c2):
		var c1 = [0, 0, 60]; //lower color
		var c2 = [178, 194, 240]; //upper color

		var w;
		for (var i=0; i<imgData.data.length; i+=4)
		{
			w = (this.val[i/4]-lower)/(upper-lower);
			imgData.data[i+0]=Math.round((1-w)*c1[0]+w*c2[0]);	
			imgData.data[i+1]=Math.round((1-w)*c1[1]+w*c2[1]);	
			imgData.data[i+2]=Math.round((1-w)*c1[2]+w*c2[2]);	
			imgData.data[i+3]=255;
		}
		ctx.putImageData(imgData,0,0);
		ctx.drawImage(canvas,0,0);

	}
}
//Prototype functions for the Field class for common operations (addition, subtraction, etc)
Field.prototype = {
	//set the calling Field equal to "b"
	equals: function (b) {
		if (typeof b === "number") {
			for (var i=0; i<this.nx*this.ny; i++)
			{
				this.val[i] = b;
			}
		} else {
			if (this.nx != b.nx || this.ny != b.ny) throw "Error in Field assignment, Fields must have same size.";

			for (var i=0; i<this.nx*this.ny; i++)
			{
				this.val[i] = b.val[i];
			}
		}
	},
	//add "b" to the calling Field
	add: function (b) {
		if (typeof b === "number") {
			var c = new Field(this.nx,this.ny);
			
			for (var i=0; i<this.nx*this.ny; i++)
			{
				c.val[i] = this.val[i]+b;
			}
		} else {
			if (this.nx != b.nx || this.ny != b.ny) throw "Error in Field addition, Fields must have same size.";

			var c = new Field(this.nx,this.ny);
			
			for (var i=0; i<this.nx*this.ny; i++)
			{
				c.val[i] = this.val[i]+b.val[i];
			}
		}
		return c;
	},
	//subtract "b" from the calling Field
	subtract: function (b) {
		if (typeof b === "number") {
			var c = new Field(this.nx,this.ny);
			
			for (var i=0; i<this.nx*this.ny; i++)
			{
				c.val[i] = this.val[i]-b;
			}
		} else {
			if (this.nx != b.nx || this.ny != b.ny) throw "Error in Field subtraction, Fields must have same size.";

			var c = new Field(this.nx,this.ny);
			
			for (var i=0; i<this.nx*this.ny; i++)
			{
				c.val[i] = this.val[i]-b.val[i];
			}
		}
		return c;
	},
	//multiply the calling Field by "b"
	multiply: function (b) {
		if (typeof b === "number") {
			var c = new Field(this.nx,this.ny);
			
			for (var i=0; i<this.nx*this.ny; i++)
			{
				c.val[i] = this.val[i]*b;
			}
		} else {
			if (this.nx != b.nx || this.ny != b.ny) throw "Error in Field multiplication, Fields must have same size.";

			var c = new Field(this.nx,this.ny);
			
			for (var i=0; i<this.nx*this.ny; i++)
			{
				c.val[i] = this.val[i]*b.val[i];
			}
		}
		return c;
	},
	//divide the calling Field by "b"
	divide: function (b) {
		if (typeof b === "number") {
			var c = new Field(this.nx,this.ny);
			
			for (var i=0; i<this.nx*this.ny; i++)
			{
				c.val[i] = this.val[i]/b;
			}
		} else {
			if (this.nx != b.nx || this.ny != b.ny) throw "Error in Field division, Fields must have same size.";

			var c = new Field(this.nx,this.ny);
			
			for (var i=0; i<this.nx*this.ny; i++)
			{
				c.val[i] = this.val[i]/b.val[i];
			}
		}
		return c;
	},
	//negate the Field
	negate: function () {

		var c = new Field(this.nx,this.ny);
		
		for (var i=0; i<this.nx*this.ny; i++)
		{
			c.val[i] = -this.val[i];
		}
		return c;
	}
}


//Object to hold the simulation state and methods for the shallow water equations
function SimState(nx,ny,H,dt,dropFreq)
{
	if (nx instanceof SimState) {
		//The first parameter passed in is an instance of the SimState class, duplicate it: 
		// In this case, the variable "nx" is actually a SimState variable rather than the
		// number of points in the x direction. I know, it's confusing.

		//parameters
		this.nx=nx.nx;
		this.ny=nx.ny;
		this.H=nx.H;
		this.dt=nx.dt;

		//state variables
		this.t=nx.t;
		this.eta=new Field(this.nx,this.ny); //disturbance height
		this.u=new Field(this.nx,this.ny); //u velocity
		this.v=new Field(this.nx,this.ny); //v velocity
		this.eta.equals(nx.eta);
		this.u.equals(nx.u);
		this.v.equals(nx.v);

		//drops
		this.drop=new Drop(nx.drop.freq);

	} else {
		//parameters
		this.nx=nx;
		this.ny=ny;
		this.H=H;
		this.dt=dt;

		//state variables
		this.t=0;
		this.eta=new Field(this.nx,this.ny);
		this.u=new Field(this.nx,this.ny);
		this.v=new Field(this.nx,this.ny);

		this.drop=new Drop(dropFreq);
	}
	
	this.RHS = RHS;
	function RHS(state,deta,du,dv)
	{

		//Compute the right hand side of for the simulation
		deta.equals( state.u.DX().add(state.v.DY()).multiply(-state.H) );
		du.equals( state.eta.DX() );
		dv.equals( state.eta.DY() );

		//Artificial diffusion (for stability and smoothing):
		deta.equals(deta.add(du.DX().add(dv.DY()).multiply(2)));

	}

	this.Step = Step;
	function Step()
	{
		//Midpoint (RK2) time step
		var deta=new Field(this.eta.nx,this.eta.ny);
		var du=new Field(this.u.nx,this.u.ny);
		var dv=new Field(this.v.nx,this.v.ny);

		this.RHS(this,deta,du,dv);

		//half step:
		var tmpState = new SimState(this);
		tmpState.eta.equals( this.eta.add(deta.multiply(this.dt/2)) );
		tmpState.u.equals( this.u.add(du.multiply(-9.81*this.dt/2)) );
		tmpState.v.equals( this.v.add(dv.multiply(-9.81*this.dt/2)) );
		tmpState.BoundaryConditions();

		this.RHS(tmpState,deta,du,dv);

		//full step:
		this.eta.equals( this.eta.add(deta.multiply(this.dt)) );
		this.u.equals( this.u.add(du.multiply(-9.81*this.dt)) );
		this.v.equals( this.v.add(dv.multiply(-9.81*this.dt)) );
		this.BoundaryConditions();

		//mouse events:
		if (mouseState.clicking && !mouseState.ignore) {
			//normalize mouse coordinates to simulation coordinates
			var i=Math.floor(mouseState.x/canvas.width*this.nx);
			var j=Math.floor(mouseState.y/canvas.height*this.ny);

			var expTerm1;
			var expTerm2;
			for (var jj=0; jj<this.ny; jj++)
			{
				for (var ii=0; ii<this.nx; ii++)
				{
					//Mouse makes the surface approach this shape (2d Gaussian):
					expTerm1 = Math.exp( (-Math.pow(ii-i,2)-Math.pow(jj-j,2))*mouseState.size );

					//Mouse influence decays at this rate (2d Gaussian):
					expTerm2 = Math.exp( (-Math.pow(((ii-i)),2)-Math.pow(((jj-j)),2))*mouseState.size/10 );

					this.eta.val[ii+this.nx*jj] += 25*(expTerm1-this.eta.val[ii+this.nx*jj])*this.dt*expTerm2;
				}
			}
		}

		//drops:
		this.drop.DropNow(this);

		this.t+=this.dt;
	}

	this.BoundaryConditions = BoundaryConditions;
	function BoundaryConditions()
	{
		//Apply reflecting boundary conditions on all sides:
		var index;
		var decay = .95; // use the boundaries to introduce height decay

		//Left:
		for (index=0; index<this.nx*this.ny; index+=this.nx)
		{
			this.eta.val[index] = decay*this.eta.val[index+1];
			this.u.val[index] = -decay*this.u.val[index+1];
			this.v.val[index] = decay*this.v.val[index+1];
		}

		//Right:
		for (index=this.nx-1; index<this.nx*this.ny; index+=this.nx)
		{
			this.eta.val[index] = decay*this.eta.val[index-1];
			this.u.val[index] = -decay*this.u.val[index-1];
			this.v.val[index] = decay*this.v.val[index-1];
		}

		//Bottom:
		for (index=0; index<this.nx; index++)
		{
			this.eta.val[index] = decay*decay*this.eta.val[index+this.nx];
			this.u.val[index] = decay*this.u.val[index+this.nx];
			this.v.val[index] = -decay*this.v.val[index+this.nx];
		}

		//Top:
		for (index=this.nx*(this.ny-1); index<this.nx*this.ny; index++)
		{
			this.eta.val[index] = decay*this.eta.val[index-this.nx];
			this.u.val[index] = decay*this.u.val[index-this.nx];
			this.v.val[index] = -decay*this.v.val[index-this.nx];
		}
	}
}


/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*\
|                                                              |
|                         start program                        |
|                                                              |
\*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

//get canvas and drawing context
var canvas=document.getElementById("main_canvas");
var ctx=canvas.getContext("2d");

//object to monitor mouse state
var mouseState = {
	size: .25, //size used for wave interaction
	clicking: false,
	ignore: false,
	x: 0,
	y: 0
};

//mouse monitoring events
document.addEventListener("mousedown", function(event) {
	mouseState.clicking = true;
	}, false);
document.addEventListener("mouseup", function(event) {
	mouseState.clicking = false;
	}, false);
document.addEventListener("mousemove", function(event) {
	mouseState.x = event.pageX;
	mouseState.y = event.pageY;
	}, false);

//don't make waves if mouse is over a form
var forms = document.getElementsByTagName("form");
for (var i=0; i<forms.length; i++) {
	forms[i].onmouseover=function () {mouseState.ignore=true};
	forms[i].onmouseout=function () {mouseState.ignore=false};
}

//map touch events to mouse events for touch compatibility:
function touchHandler(event)
{
    var touches = event.changedTouches,
	first = touches[0],
	type = "";
	switch(event.type)
	{
	  case "touchstart": type="mousedown"; break;
	  case "touchmove":  type="mousemove"; break;        
	  case "touchend":   type="mouseup"; break;
	  default: return;
	}

    //initMouseEvent(type, canBubble, cancelable, view, clickCount, 
    //               screenX, screenY, clientX, clientY, ctrlKey, 
    //               altKey, shiftKey, metaKey, button, relatedTarget);

    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, 
                                  first.screenX, first.screenY, 
                                  first.clientX, first.clientY, false, 
                                  false, false, false, 0/*left*/, null);

    first.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
}
document.addEventListener("touchstart", touchHandler, true);
document.addEventListener("touchmove", touchHandler, true);
document.addEventListener("touchend", touchHandler, true);
document.addEventListener("touchcancel", touchHandler, true);    

//Monitoring event for form submission (to change resolution):
var resolution=document.getElementById("resolution");
var newResolution=true;
resolution.setAttribute('action','javascript:newRes();');
resolution.addEventListener("submit", function(event){
	newResolution=true;
	}, false);
function newRes() {
	newResolution=true;
}

//Default resolution:
var NXinput=document.getElementById("nx");
var NYinput=document.getElementById("ny");
NXinput.value="70";
NYinput.value="70";




// Create the simulation
var params = {
	nx: 0,
	ny: 0,
	H: 10, //water depth
	dt: .025 //timestep
};

LoopSim();

function LoopSim() {
	if (newResolution)
	{
		var changed=false;

		var tmpNX=NXinput.value;
		if (parseInt(tmpNX)>0 && parseInt(tmpNX)!=params.nx)
		{
			params.nx = parseInt(tmpNX);
			NXinput.value=params.nx;
			changed=true;
		} else {
			NXinput.value=params.nx;
		}
		var tmpNY=NYinput.value;
		if (parseInt(tmpNY)>0 && parseInt(tmpNY)!=params.ny)
		{
			params.ny = parseInt(tmpNY);
			NYinput.value=params.ny;
			changed=true;
		} else {
			NYinput.value=params.ny;
		}

		if (changed) {
			//adjust the mouse interaction size based on resolution
			//mouseState.size = Math.pow(.6-Math.min(params.nx,params.ny)*.001,2);
			mouseState.size = Math.pow(.6-params.nx*params.ny/100000,2);

			//adjust the timestep (to have slower waves at lower resolutions)
			if (params.nx<70 || params.ny<70) {
				params.dt=0.001+0.024*Math.min(params.nx,params.ny)/70;
			} else {
				params.dt=0.025;
			}
			sim = new SimState(params.nx,params.ny,params.H,params.dt,document.getElementById("drop_range").value);

			//Initialize:
			for (var j=0; j<sim.ny; j++)
			{
				for (var i=0; i<sim.nx; i++)
				{
					//sim.eta.val[i+sim.nx*j] = params.eta;
					sim.eta.val[i+sim.nx*j] = 0;
					sim.u.val[i+sim.nx*j] = 0;
					sim.v.val[i+sim.nx*j] = 0;
				}
			}
		}
		newResolution=false;
	}
	//sim.eta.Draw(canvas,ctx,params.eta*1.00,params.eta*1.03);
	sim.eta.Draw(canvas,ctx,0,0.25);
	sim.Step();
	requestAnimationFrame(LoopSim);
}

