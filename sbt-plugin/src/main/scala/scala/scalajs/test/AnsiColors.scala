package scala.scalajs.test

trait AnsiColors {

  val red = "\033[31m"
  val green = "\033[32m"
  val blue = "\033[34m"
  val reset = "\033[0m"

  val all = Seq(red, green, blue, reset)

  def removeColors(message: String): String =
    all.foldLeft(message)(_.replace(_, ""))

  def color(message: String, color: String): String =
    message.split('\n').mkString(color, reset + '\n' + color, reset)
}
