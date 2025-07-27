class ApiError extends Error{
    constructor(statuscode  , message="Something went wrong" , errors=[] , stack=""
    ){
        super(message),
        this.statuscode = statuscode ,
        this.data = null ,
        this.message = message , 
        this.success = false ,
        this.errors = errors

        if(stack){
            this.stack  =stack
        }else{
                console.log(`something went wrong`);
                
            }

    }
}

export {ApiError}