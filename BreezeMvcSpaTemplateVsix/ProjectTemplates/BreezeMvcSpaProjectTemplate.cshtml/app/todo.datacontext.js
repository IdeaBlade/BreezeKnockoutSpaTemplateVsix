/* datacontext: data access and model management layer */
window.todoApp.datacontext = (function ($, breeze, model) {

    configureBreeze();
    var manager = new breeze.EntityManager("api/Todo");
    manager.enableSaveQueuing(true);
    configureManagerToSaveModifiedItemImmediately();

    var datacontext = {
        metadataStore: manager.metadataStore,
        getTodoLists: getTodoLists,
        createTodoList: createTodoList,
        createTodoItem: createTodoItem,
        saveNewTodoItem: saveNewTodoItem,
        saveNewTodoList: saveNewTodoList,
        deleteTodoItem: deleteTodoItem,
        deleteTodoList: deleteTodoList
    };

    model.initialize(datacontext);
    return datacontext;

    //#region Private Members
    function getTodoLists(todoListsObservable, errorObservable) {
        return breeze.EntityQuery
            .from("TodoLists").expand("Todos")
            .orderBy("todoListId desc")
            .using(manager).execute()
            .then(getSucceeded)
            .fail(getFailed);

        function getSucceeded(data) {
            todoListsObservable(data.results);
        }

        function getFailed(error) {
            errorObservable("Error retrieving todo lists: " + error.message);
        }
    }

    function createTodoItem() {
        return manager.createEntity("TodoItem");
    }

    function createTodoList() {
        return manager.createEntity("TodoList");
    }

    function saveNewTodoItem(todoItem) {
        return saveEntity(todoItem);
    }

    function saveNewTodoList(todoList) {
        return saveEntity(todoList);
    }

    function deleteTodoItem(todoItem) {
        todoItem.entityAspect.setDeleted();
        return saveEntity(todoItem);
    }

    function deleteTodoList(todoList) {
        // Neither breeze nor server cascade deletes so we have to do it
        var todoItems = todoList.todos().slice(); // iterate over copy
        todoItems.forEach(function (entity) { entity.entityAspect.setDeleted(); });
        todoList.entityAspect.setDeleted();
        return saveEntity(todoList);
    }

    function saveEntity(masterEntity) {

        return manager.saveChanges().fail(saveFailed);

        function saveFailed(error) {
            var msg = "Error saving " +
                describeSaveOperation(masterEntity) + ": " +
                getErrorMessage(error);

            masterEntity.errorMessage(msg);
            // Let user see invalid value briefly before reverting
            setTimeout(function () { manager.rejectChanges(); }, 1000);
            throw error; // so caller can see failure
        }
    }

    function describeSaveOperation(entity) {
        var statename = entity.entityAspect.entityState.name.toLowerCase();
        var typeName = entity.entityType.shortName;
        var title = entity.title && entity.title();
        title = title ? (" '" + title + "'") : "";
        return statename + " " + typeName + title;
    }
    function getErrorMessage(error) {
        var reason = error.message;
        if (reason.match(/validation error/i)) {
            reason = getValidationErrorMessage(error);
        }
        return reason;
    }
    function getValidationErrorMessage(error) {
        try { // return the first error message
            var firstItem = error.entitiesWithErrors[0];
            var firstError = firstItem.entityAspect.getValidationErrors()[0];
            return firstError.errorMessage;
        } catch (e) { // ignore problem extracting error message 
            return "validation error";
        }
    }
    
    function configureBreeze() {
        // configure to use camelCase
        breeze.NamingConvention.camelCase.setAsDefault();

        // configure to resist CSRF attack
        var antiForgeryToken = $("#antiForgeryToken").val();
        if (antiForgeryToken) {
            // get the current default Breeze AJAX adapter & add header
            var ajaxAdapter = breeze.config.getAdapterInstance("ajax");
            ajaxAdapter.defaultSettings = {
                headers: {
                    'RequestVerificationToken': antiForgeryToken
                },
            };
        }
    }
    function configureManagerToSaveModifiedItemImmediately() {
        manager.entityChanged.subscribe(entityStateChanged);

        function entityStateChanged(args) {
            if (args.entityAction === breeze.EntityAction.EntityStateChange) {
                var entity = args.entity;
                if (entity.entityAspect.entityState.isModified()) {
                    saveEntity(entity);
                }
            }
        }
    }
    //#endregion

})($, breeze, window.todoApp.model);