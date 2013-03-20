/* todoApp: application global namespace */
window.todoApp = window.TodoApp || {};

/* model: extend server-supplied metadata with client-side entity model members */
window.todoApp.model = (function (ko) {

    var datacontext;

    extendTodoList();
    
    var model = {
        initialize: initialize
    };

    return model;
    
    //#region private members
    function initialize(context) {
        datacontext = context;
        var store = datacontext.metadataStore;
        store.registerEntityTypeCtor("TodoItem", null, todoItemInitializer);
        store.registerEntityTypeCtor("TodoList", TodoList, todoListInitializer);
    }
    
    function todoItemInitializer(todoItem) {
        todoItem.errorMessage = ko.observable();
    }

    function todoListInitializer(todoList) {
        todoList.errorMessage = ko.observable();
        todoList.newTodoTitle = ko.observable();
        todoList.isEditingListTitle = ko.observable(false);
    }

    function TodoList() {
        this.title = "My todos"; // defaults
        this.userId = "to be replaced";
    }

    function extendTodoList() {

        TodoList.prototype.addTodo = function () {
            var todoList = this;
            var title = todoList.newTodoTitle();
            if (title) { // need a title to save
                todoList.newTodoTitle("");
                var todoItem = datacontext.createTodoItem();
                todoItem.title(title);
                todoItem.todoList(todoList);
                datacontext.saveNewTodoItem(todoItem);
            }
        };

        TodoList.prototype.deleteTodo = function () {
            return datacontext.deleteTodoItem(this); // "this" is the todoItem
        };

    }
    
    //#endregion
})(ko);