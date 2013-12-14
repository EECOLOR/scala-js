package scala.scalajs.test

import scala.scalajs.js.Dynamic.global
import scala.scalajs.js

/*
 * Experimental, this will be changed as soon as we have a good plan 
 * for resource loading.
 * 
 * Ideally we want to provide requirejs support. There are multiple 
 * options to solve this and this needs to be discussed with the community 
 * first.
 * 
 * A few thoughts:
 * 
 *   - Make sure Scala.js projects are defined as modules. We could add a 
 *     configuration option to provide the dependencies for the 
 *     project. This allows people to use the default `script data-main` 
 *     syntax. Test and run facilities should use requirejs to load stuff 
 *     in case requirejs dependencies are defined.
 *   - Just provide support for a shim, this would require the user to 
 *     add a dependency on requirejs. In the shim the user should describe 
 *     the Scala.js library
 *   - Use a construction as seen in this class. This however will litter 
 *     the code of the project with RequireJs.require calls. These are 
 *     tricky to handle because of their asynchronicity. It would be nice 
 *     if the main class would be injected with all of the dependencies.
 *     
 * I do not think adding support for requirejs should be in this commit. 
 */
trait RequireJs {

  val console = global.console

  if (!global.require.isInstanceOf[js.Function]) {
    // hide document and setTimeout from require.js, 
    // we want it to think we are a web worker and not use 
    // async stuff
    hide(Seq(global.window -> "document", global -> "setTimeout")) {
      global.importScripts("require.js")
    }
  }

  global.requirejs(
    js.Dictionary(
      "baseUrl" -> ("": js.String),
      "shim" -> js.Dictionary(
        "jasmine" -> js.Dictionary(
          "exports" -> "jasmine"))))

  global.requirejs.onError = { error: js.Dynamic =>
    console.error("requirejs error")
    console.error(error)
    console.error(error.stack)
    console.error(error.originalError)
  }

  def require(dependencies: js.Array[String], onLoad: js.Function) =
    global.require(dependencies, onLoad)

  protected def hide(scopesAndKeys: Seq[(js.Dynamic, String)])(code: => Unit) = {
    val undefined = global.undefined
    val hiddenValues =
      for ((scope, key) <- scopesAndKeys if (scope != undefined)) yield {
        val hidden = scope.selectDynamic(key)
        scope.updateDynamic(key)(undefined)
        (scope, key, hidden)
      }

    val allElementsHidden = scopesAndKeys.forall { 
      case (scope, key) if (scope != undefined) => !scope.selectDynamic(key) 
      case _ => true 
    }

    assert(allElementsHidden, "The matrix has changed, the values are not hidden")

    code

    for ((scope, key, hidden) <- hiddenValues) {
      scope.updateDynamic(key)(hidden)
      assert(scope.selectDynamic(key) == hidden, "The matrix has changed, the value of '$key' was not the same after un-hiding it")
    }
  }

}
