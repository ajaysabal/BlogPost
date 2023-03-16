const express = require('express');
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const ejs=require('ejs')
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const cookieparser=require('cookie-parser');
const flash=require('connect-flash');
const multer=require('multer');
// article database
const Article = require('./models/article')

// user data base
// const userschema=require('./models/userdata')


//routes
const userRoutes = require('./routes/user');
// const passport = require('passport');

const app = express();
//view engine

//  app.use(expressLayouts)
app.use(express.static('public'));
app.set('view engine','ejs');
app.use('/article', userRoutes);


//body parser
app.use(bodyParser.urlencoded({
    extended: true
}));
// app.use(express.json());


app.use(session({
    secret:process.env.SECRET,
    resave: false,
    saveUninitialized: false,

}));

app.use(passport.initialize());
app.use(passport.session());

//mongoose db connection 
mongoose.set('strictQuery', false);
mongoose.connect('mongodb://localhost:27017/blogWB', {
    useNewUrlParser: true
});

// app.use(flash());
// mongo user schema
const userschema = new mongoose.Schema({
    Name:{
        type:String,
        required:true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,

    }
});
userschema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userschema);



passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//routes
app.get('/', (req, res) => {
    // console.log(__dirname);
    res.render('landing');

})

// login and signup routes
app.get('/login', (req, res) => {
    // console.log(__dirname);
    res.render('login');

})
app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { 
        return next(err); 
        }
      res.redirect('/');
    });
  });
app.get('/signup', (req, res) => {
    // console.log(__dirname);
    res.render('signup');

})

app.post('/register', (req, res) => {
    const newUser = new User({
        Name:req.body.Name,
        username:req.body.username,
    });

    User.register(newUser,req.body.password,function(err,user){
        if (err) {
            console.log(err);
            res.redirect('/signup');
        } else {
            passport.authenticate("local")(req,res,function(){
                res.redirect('/home');
            });
            
    
        }
   });
});

app.post('/login', (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password,
    });
    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect('/home');
            });
        }
    });



})

app.get('/home', async (req, res) => {
    const article = await Article.find();
    // res.render('index', { article: article });
    // console.log(article)
    if (req.isAuthenticated()) {
        
        res.render('index', { article: article});
    } else {
        res.redirect(`/login`);
    }
})

app.get("/profile/User", (req, res) => {
   // console.log(req.user);
    if(req.isAuthenticated()){
        const currUserObject = req.user;
    res.render("profile", {
        currentUserObj: currUserObject
    });
    }else{
        res.redirect('/');
    }
});

app.get('/article/new',(req, res) => {
   
    if (req.isAuthenticated()) {
        res.render('new');
    } else {
        res.redirect(`/login`);
    }
})

// view more
app.get('/articleview/:slug',async(req,res)=>{
    if(req.isAuthenticated()){
        const article= await Article.findOne({slug:req.params.slug})
       if(article==null){res.redirect('/')}
       res.render('show',{article:article})
    }else{
        res.redirect('/login');
    }
})




// search api
app.get('/search/:key', async (req, res) => {
    let data = await Article.find({
        "$or": [
            { title: { $regex: req.params.key } },
            { createdname: { $regex: req.params.key } }
        ]
    })

    if (req.isAuthenticated()) {
        res.render('index', { article: data });
    } else {
        res.redirect(`/login`);
    }
})

app.post('/search', (req, res) => {
    const key = req.body.keyi;
    //  console.log(key);

    res.redirect('/search/' + key);
})


// like req

app.post('/like/:id', async (req, res) => {
    try {
        const updatelike = await Article.findOneAndUpdate({ _id: req.params.id },
            { $inc: { likcnt: 1 } },

            { new: true }
        );
        res.redirect('/home');
    } catch (error) {
        console.log(error);

    }
})


// update

app.get('/article/edit/:id',async(req,res)=>{
   if(req.isAuthenticated()){
    const article_data= await Article.findById({_id:req.params.id})
    res.render('edit',{article:article_data})
   }else{
    res.redirect('/login');
   }

})
app.post('/article/edit/:id',async(req,res)=>{
    try {
        const updatedres= await Article.findOneAndUpdate({_id:req.params.id},req.body,{new:true}
        );
        res.redirect('/home');
    } catch (error) {
        console.log(error);
        
    }
})
// delete post api
app.get('/article/delete/:id',async(req,res)=>{
    const ug= req.user;const article = await Article.find();
    const article_data= await Article.findById({_id:req.params.id});
    const mssg="YOU Cant DELETE";
    if(ug.Name===article_data.createdname){
        try {
            const dl= await Article.findByIdAndDelete({_id:req.params.id});
            res.redirect('/home');
        } catch (error) {
            console.log('error');

            
        }

    }else{
         console.log("YOU CANT DELETE");
         res.redirect('/deletemsg');
         
       
  
    }

    
})
app.get('/deletemsg',(req,res)=>{
    if(req.isAuthenticated()){
        res.render('deletemsg');
    }else{
        res.redirect('/');
    }
    
})
// saving new  data

app.post('/article',(req,res)=>{
    const ug= req.user;
    const article=new Article({
        title:req.body.title,
        des:req.body.des,
        info:req.body.info,
        createid:ug._id,
        createdname:ug.Name,

    })

    article.save().then(()=>{
       
        res.redirect('/home');
    })
})

app.get('/ajaysabal',(req,res)=>{
    res.sendFile(__dirname+'/views/check.html');
})
//port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('working on port 8080');
})